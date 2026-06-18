-- Champs societe client + creation client par admin
-- Executer dans Supabase SQL Editor sur une base existante.

alter table public.profiles add column if not exists siren text;
alter table public.profiles add column if not exists vat_number text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, company, address, siren, vat_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'company', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'siren', ''),
    coalesce(new.raw_user_meta_data->>'vat_number', '')
  );
  return new;
end;
$$;

drop policy if exists "Admin manage client profiles" on public.profiles;
create policy "Admin manage client profiles" on public.profiles for all
  using (public.is_admin() and role = 'client')
  with check (public.is_admin() and role = 'client');
