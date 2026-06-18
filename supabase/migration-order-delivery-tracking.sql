-- Suivi livraison + historique commandes/factures
-- Executer dans Supabase SQL Editor sur une base existante.

alter table public.orders add column if not exists delivery_status text default 'non_preparee';
alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists estimated_delivery_date date;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists delivery_notes text;

alter table public.orders drop constraint if exists orders_delivery_status_check;
alter table public.orders add constraint orders_delivery_status_check check (
  delivery_status in ('non_preparee', 'preparation', 'prete', 'expediee', 'en_transit', 'livree', 'incident', 'retour')
);
