-- 직관노트 Supabase 초기 스키마
-- Supabase SQL Editor에서 실행하세요. 사용자는 본인 기록만 읽고 쓸 수 있습니다.
create table if not exists public.watch_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_date date not null,
  stadium text not null check (char_length(stadium) between 1 and 60),
  favorite_team text not null default '' check (char_length(favorite_team) <= 40),
  opponent_team text not null check (char_length(opponent_team) between 1 and 40),
  favorite_score integer check (favorite_score is null or favorite_score >= 0),
  opponent_score integer check (opponent_score is null or opponent_score >= 0),
  result text not null check (result in ('win', 'draw', 'loss')),
  seat text not null default '' check (char_length(seat) <= 60),
  review text not null default '' check (char_length(review) <= 2000),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((favorite_score is null) = (opponent_score is null)),
  check (favorite_score is null or favorite_team <> ''),
  check (favorite_score is null or (favorite_score > opponent_score and result = 'win') or
         (favorite_score = opponent_score and result = 'draw') or
         (favorite_score < opponent_score and result = 'loss'))
);
create index if not exists watch_records_user_game_date_idx on public.watch_records (user_id, game_date desc, created_at desc);
alter table public.watch_records enable row level security;
revoke all on public.watch_records from anon;
grant select, insert, update, delete on public.watch_records to authenticated;

drop policy if exists "Users can read own watch records" on public.watch_records;
create policy "Users can read own watch records" on public.watch_records for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own watch records" on public.watch_records;
create policy "Users can create own watch records" on public.watch_records for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own watch records" on public.watch_records;
create policy "Users can update own watch records" on public.watch_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own watch records" on public.watch_records;
create policy "Users can delete own watch records" on public.watch_records for delete to authenticated using ((select auth.uid()) = user_id);

-- 사진용 private bucket. 각 사용자의 auth.uid()/... 디렉터리에만 접근 허용합니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('watch-photos', 'watch-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
drop policy if exists "Users can read own watch photos" on storage.objects;
create policy "Users can read own watch photos" on storage.objects for select to authenticated using (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can upload own watch photos" on storage.objects;
create policy "Users can upload own watch photos" on storage.objects for insert to authenticated with check (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can update own watch photos" on storage.objects;
create policy "Users can update own watch photos" on storage.objects for update to authenticated using (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can delete own watch photos" on storage.objects;
create policy "Users can delete own watch photos" on storage.objects for delete to authenticated using (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
