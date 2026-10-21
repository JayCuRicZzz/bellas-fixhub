-- 0010 — กันส่งแจ้งเตือนมือถือซ้ำ (เช่น GM ได้แจ้งเตือน "เกิน SLA" ใบละครั้งเดียว)
create table if not exists fixhub.push_log (
  ticket_id int  not null references fixhub.tickets(ticket_id) on delete cascade,
  kind      text not null,
  sent_at   timestamptz not null default now(),
  primary key (ticket_id, kind)
);
alter table fixhub.push_log enable row level security;
