-- Améliorations admin : prix d'achat, tarifs par volume/catégorie
-- Optionnel — le dashboard fonctionne sans ces colonnes

alter table public.products add column if not exists purchase_price numeric(10, 2) check (purchase_price >= 0);

alter table public.customer_prices add column if not exists client_category text;
alter table public.customer_prices add column if not exists min_quantity int default 1 check (min_quantity >= 1);

comment on column public.products.purchase_price is 'Prix d''achat unitaire (marge catalogue)';
comment on column public.customer_prices.client_category is 'Ex: restaurant, hotel, grossiste';
comment on column public.customer_prices.min_quantity is 'Quantité minimum pour ce tarif';
