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
alter table public.suppliers enable row level security;

drop policy if exists "Admin read suppliers" on public.suppliers;
drop policy if exists "Admin manage suppliers" on public.suppliers;

create policy "Admin read suppliers" on public.suppliers for select using (public.is_admin());
create policy "Admin manage suppliers" on public.suppliers for all
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute procedure public.set_updated_at();
