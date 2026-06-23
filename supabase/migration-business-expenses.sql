-- Dépenses manuelles pour le tableau Analyses (admin)
-- À exécuter après schema.sql et migration-stock-management.sql

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_type text not null default 'autre' check (
    expense_type in ('livraison', 'stock', 'logistique', 'fournisseur', 'autre')
  ),
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_expenses_date_idx on public.business_expenses (expense_date desc);
create index if not exists business_expenses_type_idx on public.business_expenses (expense_type);

alter table public.business_expenses enable row level security;

drop policy if exists "Admin read business expenses" on public.business_expenses;
create policy "Admin read business expenses" on public.business_expenses
  for select using (public.is_admin());

drop policy if exists "Admin insert business expenses" on public.business_expenses;
create policy "Admin insert business expenses" on public.business_expenses
  for insert with check (public.is_admin());

drop policy if exists "Admin update business expenses" on public.business_expenses;
create policy "Admin update business expenses" on public.business_expenses
  for update using (public.is_admin());

drop policy if exists "Admin delete business expenses" on public.business_expenses;
create policy "Admin delete business expenses" on public.business_expenses
  for delete using (public.is_admin());

drop trigger if exists business_expenses_updated_at on public.business_expenses;
create trigger business_expenses_updated_at before update on public.business_expenses
  for each row execute procedure public.set_updated_at();
