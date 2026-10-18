-- 0005 — sla_overdue: งานที่ช่างกดซ่อมเสร็จ (RESOLVED/APPROVED) ตัดสินจากเวลาที่ซ่อมเสร็จ ไม่ใช่เวลาปัจจุบัน
--   เดิม: RESOLVED ที่ซ่อมทันเวลาแต่ยังรออนุมัติ ถูกนับเป็น "เกินกำหนด" เมื่อเลยเส้นตาย
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
             else now() > t.sla_deadline end) as sla_overdue
from fixhub.tickets t
join fixhub.categories c on c.category_id = t.category_id
left join fixhub.profiles r   on r.user_id  = t.reporter_id
left join fixhub.profiles tu  on tu.user_id = t.technician_id
left join fixhub.profiles au  on au.user_id = t.accepted_by
left join fixhub.profiles ru  on ru.user_id = t.resolved_by
left join fixhub.profiles apu on apu.user_id = t.approved_by;
