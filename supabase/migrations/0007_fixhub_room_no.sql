-- 0007 — เลขห้องแยกเป็นคอลัมน์ (ค้นประวัติห้องได้แม่น) + ใส่ใน tickets_full
alter table fixhub.tickets add column if not exists room_no text;
create index if not exists idx_tickets_room on fixhub.tickets (branch_code, room_no) where room_no is not null;
-- เติมจากข้อความเดิม (ห้อง 305 / 305 / ห้อง302)
update fixhub.tickets set room_no = upper((regexp_match(location_detail, '(?:^|[^0-9])([0-9]{2,4}[A-Za-z]?)(?:[^0-9A-Za-z]|$)'))[1])
where room_no is null and location_detail ~ '[0-9]{2,4}';
-- tickets_full: เพิ่ม t.room_no ต่อท้าย (นิยามเต็มอยู่ใน 0006 + คอลัมน์นี้)
