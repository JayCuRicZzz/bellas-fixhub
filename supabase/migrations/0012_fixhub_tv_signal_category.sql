-- 0012 — หมวดงานช่างใหม่: ทีวี/สัญญาณทีวี (ทีวีไม่มีสัญญาณ สายอากาศ เสาอากาศ) → ส่งเข้าช่าง
-- หมวด "ระบบทีวี" (id 20) ของไอทียังอยู่สำหรับ Smart TV / กล่อง
-- id 25 ตายตัว เพื่อให้ชื่อภาษาเขมร/พม่าใน lib/i18n/extra.ts ผูกได้ · รันซ้ำได้
set role fixhub_app;
insert into fixhub.categories (category_id, dept_type, main_th, main_en, sub_th, sub_en, active)
values (25, 'MAINTENANCE', 'ทีวี/สัญญาณทีวี', 'TV / Signal', 'ทีวีไม่มีสัญญาณ, สายอากาศ, เสาอากาศ', 'No signal, antenna cable, antenna', true)
on conflict (category_id) do nothing;
select setval(pg_get_serial_sequence('fixhub.categories', 'category_id'), (select max(category_id) from fixhub.categories));
reset role;
select 'MARKER_0012_FILE_END' as marker, category_id, dept_type, main_th from fixhub.categories where category_id = 25;
