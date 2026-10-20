-- 0009 — ล้างใบงานทดสอบก่อนใช้งานจริง (กดได้ครั้งเดียว จากหน้าจัดการผู้ใช้ของแอดมิน)
-- ก่อนลบ ระบบคัดลอกทุกแถวเก็บไว้ในตารางนี้ (jsonb) — ย้อนดู/กู้คืนได้ ไม่หายถาวร
create table if not exists fixhub.reset_archive (
  id          bigint generated always as identity primary key,
  batch_at    timestamptz not null,
  batch_by    uuid,
  table_name  text not null,
  row_data    jsonb not null
);
create index if not exists idx_reset_archive_batch on fixhub.reset_archive (batch_at, table_name);
alter table fixhub.reset_archive enable row level security;
