-- 0008 — แจ้งเตือนบนมือถือผ่านเว็บแอป (Web Push) ควบคู่กับ LINE
-- 1 แถว = 1 เครื่อง/เบราว์เซอร์ที่ผู้ใช้กด "เปิดการแจ้งเตือน" · ฟรี ไม่กินโควตา LINE
-- กุญแจ VAPID สร้างเองครั้งแรกที่ใช้งาน เก็บใน fixhub.app_settings (key = 'webpush') ฝั่งเซิร์ฟเวอร์เท่านั้น
-- รันด้วย: set role fixhub_app; (ให้ role ของแอปเป็นเจ้าของตาราง)

create table if not exists fixhub.push_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_ok_at   timestamptz,
  fail_count   int not null default 0
);
create index if not exists idx_push_user on fixhub.push_subscriptions (user_id);

-- อ่าน/เขียนผ่าน API ของแอปเท่านั้น (role fixhub_app) — ปิดทาง PostgREST
alter table fixhub.push_subscriptions enable row level security;
