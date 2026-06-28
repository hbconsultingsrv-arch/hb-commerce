-- Photo de profil utilisateur (avatar_url + bucket Storage)

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-avatars', 'profile-avatars', true, 5242880)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read profile avatars" on storage.objects;
drop policy if exists "Users upload own profile avatar" on storage.objects;
drop policy if exists "Users update own profile avatar" on storage.objects;
drop policy if exists "Users delete own profile avatar" on storage.objects;

create policy "Public read profile avatars" on storage.objects
  for select using (bucket_id = 'profile-avatars');

create policy "Users upload own profile avatar" on storage.objects
  for insert with check (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own profile avatar" on storage.objects
  for update using (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own profile avatar" on storage.objects
  for delete using (
    bucket_id = 'profile-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
