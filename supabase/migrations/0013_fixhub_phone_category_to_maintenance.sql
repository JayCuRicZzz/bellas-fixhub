-- 0013 — หมวด "ระบบโทรศัพท์" (id 17) ย้ายจากงานไอทีเป็นงานช่าง (คำสั่งผู้ใช้ 23 ต.ค. 2569)
-- ใบงานเก่าหมวดนี้มี 1 ใบ (ยกเลิกแล้ว) ไม่ได้แก้
set role fixhub_app;
update fixhub.categories set dept_type = 'MAINTENANCE' where category_id = 17 and main_th = 'ระบบโทรศัพท์';
reset role;
select 'MARKER_0013_FILE_END' as marker, category_id, dept_type from fixhub.categories where category_id = 17;
