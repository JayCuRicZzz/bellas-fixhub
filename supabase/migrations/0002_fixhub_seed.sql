-- Seed: branches (7), categories (24), SLA (5), storage bucket
insert into fixhub.branches (branch_code, branch_name, branch_name_en, sort_order) values
  ('BV','เบลล่า วิลล่า พัทยา (ถ.พัทยาสาย 3)','Bella Villa Pattaya 3rd Road',1),
  ('BP','เบลล่า วิลล่า พรีมา','Bella Villa Prima',2),
  ('BC','เบลล่า วิลล่า คาบาน่า','Bella Villa Cabana',3),
  ('BM','เบลล่า วิลล่า เมโทร','Bella Villa Metro',4),
  ('BB','เบสท์ เบลล่า พัทยา','Best Bella Pattaya',5),
  ('BE','เบลล่า เอ็กซ์เพรส','Bella Express',6),
  ('GB','แกรนด์ เบลล่า พัทยา','Grand Bella Pattaya',7)
on conflict (branch_code) do update set branch_name = excluded.branch_name, branch_name_en = excluded.branch_name_en, sort_order = excluded.sort_order;

insert into fixhub.categories (category_id, dept_type, main_th, main_en, sub_th, sub_en) overriding system value values
 (1,'MAINTENANCE','ระบบปรับอากาศ','Air Conditioning','แอร์, HVAC','AC, HVAC'),
 (2,'MAINTENANCE','ระบบไฟฟ้า','Electrical','ไฟ, เบรกเกอร์, สายไฟ','Lights, Breaker, Wiring'),
 (3,'MAINTENANCE','ระบบประปา','Plumbing','น้ำรั่ว, ท่อ, ปั๊มน้ำ','Leaks, Pipes, Pump'),
 (4,'MAINTENANCE','งานโครงสร้าง','Structural','ผนัง, พื้น, ฝ้าเพดาน','Walls, Floor, Ceiling'),
 (5,'MAINTENANCE','งานทาสี','Painting','ทาสีภายใน, ภายนอก','Interior, Exterior'),
 (6,'MAINTENANCE','งานไม้/เฟอร์นิเจอร์','Carpentry/Furniture','ประตู, หน้าต่าง, เตียง','Doors, Windows, Bed'),
 (7,'MAINTENANCE','ระบบลิฟต์','Elevator','ลิฟต์โดยสาร, ลิฟต์ขนของ','Passenger, Service'),
 (8,'MAINTENANCE','สระว่ายน้ำ','Swimming Pool','เครื่องกรอง, ระบบคลอรีน','Filter, Chlorine'),
 (9,'MAINTENANCE','กุญแจ/ระบบล็อค','Locks & Keys','กลอน, แม่กุญแจ, ตู้เซฟ','Bolts, Padlock, Safe'),
 (10,'MAINTENANCE','งานกระจก','Glass','หน้าต่าง, กระจกเงา, ประตูกระจก','Window, Mirror, Glass Door'),
 (11,'MAINTENANCE','งานกระเบื้อง/หินอ่อน','Tiling/Marble','ปูกระเบื้อง, หินขัด','Tile, Marble'),
 (12,'MAINTENANCE','กันซึม/หลังคา','Waterproofing/Roof','รอยรั่ว, ดาดฟ้า','Leak, Rooftop'),
 (13,'MAINTENANCE','ภูมิทัศน์/สวน','Landscape/Garden','ต้นไม้, สนามหญ้า, ทางเดิน','Trees, Lawn, Path'),
 (14,'MAINTENANCE','ป้าย/ไฟโฆษณา','Signage/Lighting','ป้ายโรงแรม, ไฟหน้า','Hotel Sign, Facade'),
 (15,'IT','ระบบเครือข่าย','Network','Internet, LAN, VLAN','Internet, LAN'),
 (16,'IT','WiFi/อินเทอร์เน็ต','WiFi/Internet','สัญญาณอ่อน, หลุดบ่อย','Weak Signal, Dropouts'),
 (17,'IT','ระบบโทรศัพท์','Phone System','ตู้สาขา, เครื่องโทรศัพท์','PBX, Handsets'),
 (18,'IT','คอมพิวเตอร์','Computer','PC, Notebook, จอ','PC, Laptop, Monitor'),
 (19,'IT','ระบบกล้องวงจรปิด','CCTV','กล้อง, DVR, จอแสดงผล','Camera, DVR, Display'),
 (20,'IT','ระบบทีวี','TV System','Smart TV, กล่อง, สัญญาณ','Smart TV, Box, Signal'),
 (21,'IT','ระบบเสียง','Sound System','ลำโพง, ไมค์, ห้องประชุม','Speaker, Mic, Meeting'),
 (22,'IT','ระบบคีย์การ์ด','Key Card System','เครื่องอ่านบัตร, ซอฟต์แวร์','Reader, Software'),
 (23,'IT','เครื่องพิมพ์','Printer','Printer, Scanner, ตลับหมึก','Printer, Scanner, Toner'),
 (24,'IT','ซอฟต์แวร์/PMS','PMS/Software','ระบบจอง, เช็คอิน, POS','Booking, Check-in, POS')
on conflict (category_id) do nothing;
select setval(pg_get_serial_sequence('fixhub.categories','category_id'), 24, true);

insert into fixhub.sla_config (priority, sla_minutes, description) values
  ('urgent',120,'ด่วนที่สุด - ภายใน 2 ชั่วโมง'),
  ('high',240,'สูง - ภายใน 4 ชั่วโมง'),
  ('medium',480,'ปานกลาง - ภายใน 8 ชั่วโมง'),
  ('low',1440,'ปกติ - ภายใน 24 ชั่วโมง'),
  ('non_urgent',4320,'ไม่เร่งด่วน - ภายใน 72 ชั่วโมง')
on conflict (priority) do nothing;

-- Storage bucket for ticket photos (public read; uploads only via server/service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-images','ticket-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/heic'])
on conflict (id) do nothing;
