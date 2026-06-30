-- Fournisseur : ne voir que ses propres produits et stocks
-- À exécuter dans Supabase SQL Editor

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products" on public.products for select
  using (
    public.is_admin()
    or (active = true and not public.is_supplier())
    or (public.is_supplier() and public.is_own_supplier(supplier_id))
  );

drop policy if exists "Public read product stocks" on public.product_stocks;
create policy "Public read product stocks" on public.product_stocks for select
  using (public.is_admin() or not public.is_supplier());
