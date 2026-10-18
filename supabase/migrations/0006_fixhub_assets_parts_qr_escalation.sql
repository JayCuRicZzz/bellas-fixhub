-- 0006 — ห้อง/จุด + QR · ทะเบียนทรัพย์สิน · อะไหล่และสต็อก · การเร่งงานอัตโนมัติ (escalation)
-- idempotent · RLS เปิดแบบ deny-by-default เหมือนตารางอื่น (แอปเข้าผ่าน role fixhub_app ซึ่งเป็นเจ้าของ schema)

-- ── ห้อง / จุดในโรงแรม (แต่ละจุดมี QR ของตัวเอง) ─────────────────────────────
create table if not exists fixhub.locations (
  location_id  serial primary key,
  branch_code  text not null references fixhub.branches(branch_code),
  code         text not null,                         -- เลขห้อง/รหัสจุด เช่น 305, LOBBY, POOL
  name         text not null,                         -- ชื่อที่แสดง เช่น "ห้อง 305", "ล็อบบี้"
  kind         text not null default 'room' check (kind in ('room','area')),
  floor        text,
  qr_token     text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (branch_code, code)
);
create index if not exists idx_locations_branch on fixhub.locations (branch_code) where active;

-- ── ทะเบียนทรัพย์สิน / อุปกรณ์ ────────────────────────────────────────────────
create table if not exists fixhub.assets (
  asset_id        serial primary key,
  asset_code      text not null unique,               -- BV-AC-0001 (สร้างอัตโนมัติ)
  branch_code     text not null references fixhub.branches(branch_code),
  location_id     int references fixhub.locations(location_id) on delete set null,
  dept_type       text not null check (dept_type in ('MAINTENANCE','IT')),
  asset_type      text not null,                      -- AC, TV, FRIDGE, WH, PC, PRINTER, AP, CCTV, ...
  name            text not null,
  brand           text,
  model           text,
  serial_no       text,
  install_date    date,
  warranty_until  date,
  vendor          text,
  note            text,
  qr_token        text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active          boolean not null default true,
  created_by      uuid references fixhub.profiles(user_id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_assets_branch   on fixhub.assets (branch_code) where active;
create index if not exists idx_assets_location on fixhub.assets (location_id);

create table if not exists fixhub.asset_counters (
  branch_code text not null,
  asset_type  text not null,
  last_no     int  not null default 0,
  primary key (branch_code, asset_type)
);

create or replace function fixhub.next_asset_code(p_branch text, p_type text)
returns text language plpgsql set search_path = '' as $$
declare n int;
begin
  insert into fixhub.asset_counters (branch_code, asset_type, last_no) values (p_branch, upper(p_type), 1)
  on conflict (branch_code, asset_type) do update set last_no = fixhub.asset_counters.last_no + 1
  returning last_no into n;
  return p_branch || '-' || upper(p_type) || '-' || lpad(n::text, 4, '0');
end $$;

-- ── ใบงานผูกกับห้อง/อุปกรณ์ ───────────────────────────────────────────────────
alter table fixhub.tickets add column if not exists location_id int references fixhub.locations(location_id) on delete set null;
alter table fixhub.tickets add column if not exists asset_id    int references fixhub.assets(asset_id) on delete set null;
create index if not exists idx_tickets_asset    on fixhub.tickets (asset_id)    where asset_id is not null;
create index if not exists idx_tickets_location on fixhub.tickets (location_id) where location_id is not null;

-- ── อะไหล่ + การเคลื่อนไหวสต็อก (สต็อก = ผลรวม moves ต่อสาขา → ตรวจย้อนหลังได้ทุกรายการ) ──
create table if not exists fixhub.parts (
  part_id     serial primary key,
  part_code   text not null unique,
  name        text not null,
  unit        text not null default 'ชิ้น',
  dept_type   text not null default 'MAINTENANCE' check (dept_type in ('MAINTENANCE','IT')),
  min_stock   numeric(12,2) not null default 0,
  unit_cost   numeric(12,2) not null default 0,       -- ราคาต่อหน่วยล่าสุด (ใช้เป็นค่าเริ่มต้นตอนเบิก)
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists fixhub.part_moves (
  move_id     bigserial primary key,
  part_id     int not null references fixhub.parts(part_id),
  branch_code text not null references fixhub.branches(branch_code),
  qty         numeric(12,2) not null check (qty <> 0), -- + รับเข้า / − เบิกใช้
  unit_cost   numeric(12,2) not null default 0,
  kind        text not null check (kind in ('IN','USE','ADJUST','RETURN')),
  ticket_id   int references fixhub.tickets(ticket_id) on delete set null,
  note        text,
  moved_by    uuid references fixhub.profiles(user_id) on delete set null,
  moved_at    timestamptz not null default now()
);
create index if not exists idx_part_moves_part   on fixhub.part_moves (part_id, branch_code);
create index if not exists idx_part_moves_ticket on fixhub.part_moves (ticket_id) where ticket_id is not null;

create or replace view fixhub.part_stock with (security_invoker = true) as
select p.part_id, b.branch_code, coalesce(sum(m.qty), 0)::numeric(12,2) as qty
from fixhub.parts p
cross join fixhub.branches b
left join fixhub.part_moves m on m.part_id = p.part_id and m.branch_code = b.branch_code
where b.active
group by p.part_id, b.branch_code;

-- ── การเร่งงาน: ส่งแจ้งเตือนแต่ละระดับครั้งเดียวต่อใบงาน ─────────────────────────
create table if not exists fixhub.ticket_escalations (
  ticket_id int  not null references fixhub.tickets(ticket_id) on delete cascade,
  level     text not null check (level in ('not_accepted','sla_near','sla_breached')),
  sent_at   timestamptz not null default now(),
  primary key (ticket_id, level)
);

-- ── RLS (deny-by-default) ────────────────────────────────────────────────────
alter table fixhub.locations          enable row level security;
alter table fixhub.assets             enable row level security;
alter table fixhub.asset_counters     enable row level security;
alter table fixhub.parts              enable row level security;
alter table fixhub.part_moves         enable row level security;
alter table fixhub.ticket_escalations enable row level security;

-- tickets_full: เพิ่มห้อง/อุปกรณ์ (คอลัมน์ใหม่ต่อท้ายเท่านั้น)
create or replace view fixhub.tickets_full with (security_invoker = true) as
select t.ticket_id, t.ticket_number, t.branch_code, t.category_id, t.reporter_id, t.reporter_department,
       t.technician_id, t.accepted_by, t.resolved_by, t.approved_by, t.location_detail, t.description,
       t.priority, t.difficulty, t.status, t.pending_reason, t.paused_reason, t.paused_at, t.paused_expected_end,
       t.kpi_rating, t.sla_deadline, t.sla_minutes, t.accepted_at, t.resolved_at, t.approved_at,
       t.created_at, t.updated_at,
       c.main_th, c.main_en, c.sub_th, c.sub_en, c.dept_type,
       r.full_name  as reporter_name,
       tu.full_name as technician_name,
       au.full_name as accepted_by_name,
       ru.full_name as resolved_by_name,
       apu.full_name as approved_by_name,
       (t.sla_deadline is not null and t.status <> 'CANCELLED' and
        case when t.status in ('RESOLVED','APPROVED') then t.resolved_at > t.sla_deadline
             else now() > t.sla_deadline end) as sla_overdue,
       t.location_id, t.asset_id,
       l.name as location_name,
       a.asset_code, a.name as asset_name
from fixhub.tickets t
join fixhub.categories c on c.category_id = t.category_id
left join fixhub.profiles r   on r.user_id  = t.reporter_id
left join fixhub.profiles tu  on tu.user_id = t.technician_id
left join fixhub.profiles au  on au.user_id = t.accepted_by
left join fixhub.profiles ru  on ru.user_id = t.resolved_by
left join fixhub.profiles apu on apu.user_id = t.approved_by
left join fixhub.locations l  on l.location_id = t.location_id
left join fixhub.assets a     on a.asset_id = t.asset_id;
