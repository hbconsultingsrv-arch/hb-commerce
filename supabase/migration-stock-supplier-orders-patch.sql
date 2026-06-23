-- Patch rapide — colonnes achat fournisseur manquantes sur supplier_orders
-- Exécuter dans Supabase SQL Editor (projet HB Commerce partagé)
-- Si erreur "products does not exist" → lancer d'abord schema.sql + migration-suppliers.sql

alter table public.supplier_orders
  add column if not exists unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0);

alter table public.supplier_orders
  add column if not exists total_price numeric(14, 2) check (total_price is null or total_price >= 0);

alter table public.supplier_orders
  add column if not exists order_date date default current_date;

alter table public.supplier_orders
  add column if not exists invoice_url text;

alter table public.supplier_orders
  add column if not exists invoice_document_name text;

alter table public.supplier_orders
  add column if not exists depot_received boolean default false;

alter table public.supplier_orders
  add column if not exists depot_received_at timestamptz;

alter table public.supplier_orders
  add column if not exists depot_received_by uuid references auth.users(id) on delete set null;

-- Colonnes stock dépôt sur products (si pas encore fait)
alter table public.products
  add column if not exists stock_quantity int default 0 check (stock_quantity >= 0);

alter table public.products
  add column if not exists min_stock_alert int default 10 check (min_stock_alert >= 0);

-- Recharger le cache schéma PostgREST (Supabase)
notify pgrst, 'reload schema';
