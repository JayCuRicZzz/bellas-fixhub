-- 0011 — ธง "เติมน้ำยาแอร์" ที่ช่างติ๊กเองตอนกดซ่อมเสร็จ (แทนการเดาจากคำว่า "น้ำยา" ในข้อความ)
-- เหตุ: คำว่า "น้ำยา" จับผิด เช่น "ฉีดน้ำยาหล่อลื่น" (BP 702) ถูกนับเป็นเติมน้ำยาแอร์
-- เติมซ้ำในห้องเดียวกัน (หรือแอร์เครื่องเดียวกันถ้าผูก QR) ภายใน 15 วัน → refrigerant_repeat_of ชี้ใบก่อนหน้า = ป้ายแดง
-- รันด้วย: set role fixhub_app;

alter table fixhub.tickets
  add column if not exists refrigerant_refilled boolean not null default false,
  add column if not exists refrigerant_type text,
  add column if not exists refrigerant_repeat_of integer references fixhub.tickets(ticket_id),
  add column if not exists refrigerant_repeat_days integer;

alter table fixhub.tickets drop constraint if exists tickets_refrigerant_type_chk;
alter table fixhub.tickets add constraint tickets_refrigerant_type_chk
  check (refrigerant_type is null or refrigerant_type in ('R32','R410A','R22','OTHER'));

create index if not exists idx_tickets_refrigerant
  on fixhub.tickets (branch_code, room_no, resolved_at) where refrigerant_refilled;

-- tickets_full: นิยามเดิมทั้งหมด + 4 คอลัมน์ใหม่ต่อท้าย
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
       t.location_id, t.asset_id, l.name as location_name, a.asset_code, a.name as asset_name,
       t.room_no,
       t.refrigerant_refilled, t.refrigerant_type, t.refrigerant_repeat_of, t.refrigerant_repeat_days
from fixhub.tickets t
join fixhub.categories c on c.category_id = t.category_id
left join fixhub.profiles r   on r.user_id  = t.reporter_id
left join fixhub.profiles tu  on tu.user_id = t.technician_id
left join fixhub.profiles au  on au.user_id = t.accepted_by
left join fixhub.profiles ru  on ru.user_id = t.resolved_by
left join fixhub.profiles apu on apu.user_id = t.approved_by
left join fixhub.locations l  on l.location_id = t.location_id
left join fixhub.assets a     on a.asset_id = t.asset_id;

-- ย้อนหลังวันแรกที่ใช้จริง: เฉพาะบันทึกช่างที่เขียนว่า "เติมน้ำยา" ชัด ๆ (ไม่รวม "ฉีดน้ำยาหล่อลื่น")
update fixhub.tickets
   set refrigerant_refilled = true,
       refrigerant_type = case when pending_reason ~* 'R\s*32' then 'R32'
                               when pending_reason ~* 'R\s*410' then 'R410A'
                               when pending_reason ~* 'R\s*22' then 'R22' end
 where status in ('RESOLVED','APPROVED') and not refrigerant_refilled
   and pending_reason like '%เติมน้ำยา%';

select 'MARKER_0011_FILE_END' as marker,
       (select count(*) from fixhub.tickets where refrigerant_refilled) as flagged;
