-- Run in the Supabase project's SQL Editor.
-- Each authenticated user can access only their own daily records.
create table if not exists public.brb_daily_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, record_date),
  constraint payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint payload_hours_valid check (
    payload ? 'hours' and jsonb_typeof(payload->'hours') = 'number'
    and (payload->>'hours')::numeric between 0 and 24
  ),
  constraint payload_date_matches check (
    payload ? 'date' and payload->>'date' = record_date::text
  ),
  constraint payload_purposes_valid check (
    payload ? 'purpose' and jsonb_typeof(payload->'purpose') = 'array'
    and jsonb_array_length(payload->'purpose') between 1 and 20
  ),
  constraint payload_factors_valid check (
    payload ? 'factor' and jsonb_typeof(payload->'factor') = 'array'
    and jsonb_array_length(payload->'factor') <= 30
  ),
  constraint payload_size_valid check (octet_length(payload::text) <= 12000)
);
create or replace function public.brb_touch_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
drop trigger if exists brb_record_updated_at on public.brb_daily_records;
create trigger brb_record_updated_at before update on public.brb_daily_records
for each row execute function public.brb_touch_record();
alter table public.brb_daily_records enable row level security;
revoke all on public.brb_daily_records from anon;
grant select, insert, update, delete on public.brb_daily_records to authenticated;

drop policy if exists brb_select_own on public.brb_daily_records;
create policy brb_select_own on public.brb_daily_records for select
to authenticated using ((select auth.uid()) = user_id);
drop policy if exists brb_insert_own on public.brb_daily_records;
create policy brb_insert_own on public.brb_daily_records for insert
to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists brb_update_own on public.brb_daily_records;
create policy brb_update_own on public.brb_daily_records for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists brb_delete_own on public.brb_daily_records;
create policy brb_delete_own on public.brb_daily_records for delete
to authenticated using ((select auth.uid()) = user_id);
