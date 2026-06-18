-- Gestion des fournisseurs
-- Executer dans Supabase SQL Editor sur une base existante.

create table if not exists public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  siren text,
  vat_number text,
  country text,
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products add column if not exists supplier_id uuid references public.suppliers on delete set null;
alter table public.profiles add column if not exists supplier_id uuid references public.suppliers(id);
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'supplier', 'agent_commercial', 'admin', 'super_root'));

create table if not exists public.product_stocks (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers on delete cascade not null,
  product_slug text not null,
  quantity int default 0 check (quantity >= 0),
  reserved_quantity int default 0 check (reserved_quantity >= 0),
  lead_time_days int default 7 check (lead_time_days >= 0),
  updated_at timestamptz default now(),
  unique (supplier_id, product_slug)
);

create table if not exists public.supplier_orders (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers on delete cascade not null,
  product_slug text not null,
  quantity int not null check (quantity > 0),
  status text default 'requested' check (status in ('requested', 'accepted', 'in_preparation', 'shipped', 'received', 'cancelled')),
  expected_arrival_date date,
  tracking_number text,
  tracking_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.suppliers enable row level security;
alter table public.product_stocks enable row level security;
alter table public.supplier_orders enable row level security;

create or replace function public.is_supplier()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'supplier'
  );
$$;

create or replace function public.is_own_supplier(supplier uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'supplier'
      and supplier_id = supplier
  );
$$;

drop policy if exists "Admin read suppliers" on public.suppliers;
drop policy if exists "Admin manage suppliers" on public.suppliers;
drop policy if exists "Supplier read own supplier" on public.suppliers;

create policy "Admin read suppliers" on public.suppliers for select using (public.is_admin());
create policy "Admin manage suppliers" on public.suppliers for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Supplier read own supplier" on public.suppliers for select
  using (public.is_own_supplier(id));

drop policy if exists "Admin manage client profiles" on public.profiles;
create policy "Admin manage client profiles" on public.profiles for all
  using (public.is_admin() and role in ('client', 'supplier', 'agent_commercial'))
  with check (public.is_admin() and role in ('client', 'supplier', 'agent_commercial'));

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
    and not public.is_super_root()
    and not (
      public.is_admin()
      and old.role in ('client', 'supplier', 'agent_commercial')
      and new.role in ('client', 'supplier', 'agent_commercial')
    )
    and session_user not in ('postgres', 'supabase_admin')
  then
    raise exception 'Seul le super root peut modifier les roles.';
  end if;
  if new.role in ('agent_commercial', 'admin', 'super_root') then
    new.company = 'HB Commerce';
  end if;
  return new;
end;
$$;

drop policy if exists "Public read product stocks" on public.product_stocks;
drop policy if exists "Admin manage product stocks" on public.product_stocks;
drop policy if exists "Supplier manage own product stocks" on public.product_stocks;

create policy "Public read product stocks" on public.product_stocks for select using (true);
create policy "Admin manage product stocks" on public.product_stocks for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Supplier manage own product stocks" on public.product_stocks for all
  using (public.is_own_supplier(supplier_id)) with check (public.is_own_supplier(supplier_id));

drop policy if exists "Admin manage supplier orders" on public.supplier_orders;
drop policy if exists "Supplier read own supplier orders" on public.supplier_orders;
drop policy if exists "Supplier update own supplier orders" on public.supplier_orders;

create policy "Admin manage supplier orders" on public.supplier_orders for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Supplier read own supplier orders" on public.supplier_orders for select
  using (public.is_own_supplier(supplier_id));
create policy "Supplier update own supplier orders" on public.supplier_orders for update
  using (public.is_own_supplier(supplier_id));

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute procedure public.set_updated_at();

drop trigger if exists product_stocks_updated_at on public.product_stocks;
create trigger product_stocks_updated_at before update on public.product_stocks
  for each row execute procedure public.set_updated_at();

drop trigger if exists supplier_orders_updated_at on public.supplier_orders;
create trigger supplier_orders_updated_at before update on public.supplier_orders
  for each row execute procedure public.set_updated_at();
