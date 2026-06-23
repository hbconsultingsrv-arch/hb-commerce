-- Espace fournisseur en lecture seule : consultation stock et commandes uniquement
-- À exécuter dans Supabase SQL Editor après migration-suppliers.sql

drop policy if exists "Supplier manage own product stocks" on public.product_stocks;
drop policy if exists "Supplier read own product stocks" on public.product_stocks;
drop policy if exists "Supplier update own supplier orders" on public.supplier_orders;

create policy "Supplier read own product stocks" on public.product_stocks for select
  using (public.is_own_supplier(supplier_id));

-- "Supplier read own supplier orders" reste en SELECT (déjà présente) ;
-- la policy UPDATE est supprimée ci-dessus.
