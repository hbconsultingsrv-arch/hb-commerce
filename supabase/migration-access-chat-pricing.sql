-- Roles super root/admin/client + prix personnalises + chat modere
-- Executer dans Supabase SQL Editor sur une base existante.

alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'client' where role = 'user';
alter table public.profiles alter column role set default 'client';
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'admin', 'super_root'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('en_attente', 'validee', 'en_attente_paiement', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee')
);

create table if not exists public.customer_prices (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles on delete cascade not null,
  product_slug text not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (profile_id, product_slug)
);

create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.profiles on delete cascade not null,
  author_id uuid references auth.users on delete set null,
  author_role text not null check (author_role in ('client', 'admin', 'super_root')),
  message text not null check (length(trim(message)) > 0),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users on delete set null,
  moderated_at timestamptz,
  created_at timestamptz default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_root')
  );
$$;

create or replace function public.is_super_root()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_root'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_super_root() then
    raise exception 'Seul le super root peut modifier les roles.';
  end if;
  return new;
end;
$$;

alter table public.customer_prices enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Super root manage profiles" on public.profiles;
create policy "Super root manage profiles" on public.profiles for all
  using (public.is_super_root()) with check (public.is_super_root());

drop policy if exists "Users read own customer prices" on public.customer_prices;
drop policy if exists "Admin read customer prices" on public.customer_prices;
drop policy if exists "Super root manage customer prices" on public.customer_prices;

create policy "Users read own customer prices" on public.customer_prices for select
  using (auth.uid() = profile_id);
create policy "Admin read customer prices" on public.customer_prices for select
  using (public.is_admin());
create policy "Super root manage customer prices" on public.customer_prices for all
  using (public.is_super_root()) with check (public.is_super_root());

drop policy if exists "Users read own chat" on public.chat_messages;
drop policy if exists "Users create own chat messages" on public.chat_messages;
drop policy if exists "Admin read all chat" on public.chat_messages;
drop policy if exists "Admin create chat messages" on public.chat_messages;
drop policy if exists "Admin moderate chat messages" on public.chat_messages;

create policy "Users read own chat" on public.chat_messages for select using (
  auth.uid() = company_id
  and (
    status = 'approved'
    or (author_id = auth.uid() and status = 'pending')
  )
);
create policy "Users create own chat messages" on public.chat_messages for insert with check (
  auth.uid() = company_id
  and author_id = auth.uid()
  and author_role = 'client'
  and status = 'pending'
);
create policy "Admin read all chat" on public.chat_messages for select using (public.is_admin());
create policy "Admin create chat messages" on public.chat_messages for insert with check (
  public.is_admin()
  and author_id = auth.uid()
  and author_role in ('admin', 'super_root')
  and status = 'approved'
);
create policy "Admin moderate chat messages" on public.chat_messages for update using (public.is_admin());

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles
  for each row execute procedure public.protect_profile_role();

drop trigger if exists customer_prices_updated_at on public.customer_prices;
create trigger customer_prices_updated_at before update on public.customer_prices
  for each row execute procedure public.set_updated_at();
