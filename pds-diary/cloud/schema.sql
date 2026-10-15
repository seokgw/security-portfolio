-- Plan-Do-See state for the GitHub Pages client.
-- Authenticated users can read and update only their own row.
create table if not exists public.pds_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"plans":[],"tasks":[],"logs":[],"reflections":[],"daily_records":[],"rule_changes":[],"plan_history":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint pds_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint pds_payload_size check (octet_length(payload::text) <= 500000)
);

create or replace function public.pds_touch_data()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

drop trigger if exists pds_data_updated_at on public.pds_user_data;
create trigger pds_data_updated_at before update on public.pds_user_data
for each row execute function public.pds_touch_data();

alter table public.pds_user_data enable row level security;
revoke all on public.pds_user_data from anon;
grant select, insert, update, delete on public.pds_user_data to authenticated;

drop policy if exists pds_select_own on public.pds_user_data;
create policy pds_select_own on public.pds_user_data for select
to authenticated using ((select auth.uid()) = user_id);
drop policy if exists pds_insert_own on public.pds_user_data;
create policy pds_insert_own on public.pds_user_data for insert
to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists pds_update_own on public.pds_user_data;
create policy pds_update_own on public.pds_user_data for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists pds_delete_own on public.pds_user_data;
create policy pds_delete_own on public.pds_user_data for delete
to authenticated using ((select auth.uid()) = user_id);
