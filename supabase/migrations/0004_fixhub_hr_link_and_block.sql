-- 0004 — HR link objects (เดิมสร้างตรงบนฐานข้อมูล ไม่มีใน repo) + การระงับสิทธิ์บัญชี HR
-- idempotent: รันซ้ำได้ ใช้ทั้งกับฐานข้อมูลใหม่และฐานข้อมูลที่มีอยู่แล้ว
-- ต้องมีตาราง public.app_users / employees / departments / branches ของ Bella HR อยู่ในฐานข้อมูลเดียวกัน

-- ── profiles: ผูกกับพนักงาน HR ──────────────────────────────────────────────
alter table fixhub.profiles add column if not exists employee_id   uuid;
alter table fixhub.profiles add column if not exists employee_code text;
alter table fixhub.profiles add column if not exists managed_by_hr boolean default false;
alter table fixhub.profiles add column if not exists last_login_at timestamptz;
-- ระงับสิทธิ์ FixHub (แอดมินลบบัญชี HR) — การซิงก์จาก HR จะไม่เปิดสิทธิ์คืนเอง
alter table fixhub.profiles add column if not exists blocked boolean not null default false;
create index if not exists idx_profiles_employee on fixhub.profiles (employee_id);

-- ── แผนก HR → role ใน FixHub ────────────────────────────────────────────────
create table if not exists fixhub.hr_role_map (
  dept_code  text primary key,
  role       text not null,
  head_role  text,
  department text,
  note       text
);
alter table fixhub.hr_role_map enable row level security;

insert into fixhub.hr_role_map (dept_code, role, head_role, department, note) values
  ('EN','tech','sup','MAINT','ช่าง — หัวหน้าแผนก = หัวหน้าช่าง'),
  ('IT','it','supit','IT','ไอที — หัวหน้าแผนก = หัวหน้าไอที'),
  ('FO','front','front',null,'ต้อนรับ — ผู้แจ้ง'),
  ('HK','house','house',null,'แม่บ้าน — ผู้แจ้ง'),
  ('FB','front','front',null,'ห้องอาหารและบาร์ — ผู้แจ้ง'),
  ('MK','front','front',null,'ครัว — ผู้แจ้ง'),
  ('ACC','front','front',null,'บัญชี — ผู้แจ้ง'),
  ('PU','front','front',null,'จัดซื้อ — ผู้แจ้ง'),
  ('HR','front','front',null,'บุคคล — ผู้แจ้ง'),
  ('GE','front','front',null,'ทั่วไป/สวน — ผู้แจ้ง'),
  ('DR','front','front',null,'พนักงานขับรถ — ผู้แจ้ง'),
  ('EXEC','gm','gm',null,'ฝ่ายบริหาร — ดูทุกสาขา')
on conflict (dept_code) do nothing;

-- ── อ่านข้อมูลพนักงานจาก Bella HR ด้วย auth user id ─────────────────────────
create or replace function fixhub.hr_employee_for_auth(p_auth_user_id uuid)
returns table(employee_id uuid, employee_code text, full_name text, dept_code text, branch_code text,
              is_department_head boolean, status text, line_user_id text, must_change_password boolean)
language sql security definer set search_path to 'public', 'pg_temp'
as $$
  select e.id, e.code, e.full_name, d.code, b.code, coalesce(e.is_department_head,false), e.status, e.line_user_id,
         coalesce(au.must_change_password,false)
  from public.app_users au
  join public.employees e on e.id = au.employee_id
  left join public.departments d on d.id = e.department_id
  left join public.branches b on b.id = e.current_branch_id
  where au.auth_user_id = p_auth_user_id
  limit 1
$$;
-- security definer → เปิดให้เฉพาะ role ของแอป
revoke all on function fixhub.hr_employee_for_auth(uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'fixhub_app') then
    execute 'grant execute on function fixhub.hr_employee_for_auth(uuid) to fixhub_app';
  end if;
end $$;
