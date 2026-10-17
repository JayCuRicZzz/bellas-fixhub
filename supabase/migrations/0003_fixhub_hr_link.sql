
-- hardening (security advisor): pin search_path on helper functions
alter function fixhub.today_bkk() set search_path = '';
alter function fixhub.set_updated_at() set search_path = '';
alter function fixhub.next_ticket_number(text, text) set search_path = '';
