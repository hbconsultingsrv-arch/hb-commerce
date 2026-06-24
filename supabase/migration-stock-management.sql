-- Gestion stock HB Commerce — quantités, alertes, mouvements, déduction auto
-- Exécuter dans Supabase SQL Editor après les migrations existantes.

alter table public.products
  add column if not exists stock_quantity int default 0 check (stock_quantity >= 0);

alter table public.products
  add column if not exists min_stock_alert int default 10 check (min_stock_alert >= 0);

create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_slug text not null,
  product_id uuid references public.products(id) on delete set null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment')),
  quantity_delta int not null,
  quantity_after int not null check (quantity_after >= 0),
  order_id uuid references public.orders(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists stock_movements_slug_idx on public.stock_movements (product_slug);
create index if not exists stock_movements_created_idx on public.stock_movements (created_at desc);

alter table public.stock_movements enable row level security;

drop policy if exists "Admin read stock movements" on public.stock_movements;
drop policy if exists "Admin insert stock movements" on public.stock_movements;

create policy "Admin read stock movements" on public.stock_movements
  for select using (public.is_admin());

create policy "Admin insert stock movements" on public.stock_movements
  for insert with check (public.is_admin());

-- Réception d'achat / réapprovisionnement
create or replace function public.receive_product_stock(
  p_slug text,
  p_qty int,
  p_notes text default null,
  p_user_id uuid default auth.uid()
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_qty int;
  pid uuid;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantité invalide';
  end if;

  update public.products
  set stock_quantity = coalesce(stock_quantity, 0) + p_qty
  where slug = p_slug
  returning stock_quantity, id into new_qty, pid;

  if not found then
    raise exception 'Produit introuvable : %', p_slug;
  end if;

  insert into public.stock_movements (
    product_slug, product_id, movement_type, quantity_delta, quantity_after, notes, created_by
  ) values (
    p_slug, pid, 'purchase', p_qty, new_qty, p_notes, p_user_id
  );

  return new_qty;
end;
$$;

-- Déduction lors d'une vente (commande client)
create or replace function public.deduct_product_stock(
  p_slug text,
  p_qty int,
  p_order_id uuid default null,
  p_user_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_qty int;
  new_qty int;
  pid uuid;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantité invalide';
  end if;

  select stock_quantity, id into current_qty, pid
  from public.products
  where slug = p_slug
  for update;

  if not found then
    raise exception 'Produit introuvable : %', p_slug;
  end if;

  current_qty := coalesce(current_qty, 0);

  if current_qty < p_qty then
    raise exception 'Stock insuffisant pour % (disponible : %, demandé : %)', p_slug, current_qty, p_qty;
  end if;

  new_qty := current_qty - p_qty;

  update public.products
  set stock_quantity = new_qty
  where slug = p_slug;

  insert into public.stock_movements (
    product_slug, product_id, movement_type, quantity_delta, quantity_after, order_id, created_by
  ) values (
    p_slug, pid, 'sale', -p_qty, new_qty, p_order_id, p_user_id
  );

  return new_qty;
end;
$$;

-- Vérifier le stock avant commande (lecture)
create or replace function public.check_order_stock(p_items jsonb)
returns table (product_slug text, requested int, available int, ok boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  slug text;
  qty int;
  avail int;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    slug := item->>'slug';
    qty := coalesce((item->>'quantity')::int, 0);
    select coalesce(stock_quantity, 0) into avail from public.products where products.slug = slug;
    product_slug := slug;
    requested := qty;
    available := coalesce(avail, 0);
    ok := coalesce(avail, 0) >= qty;
    return next;
  end loop;
end;
$$;

grant execute on function public.receive_product_stock(text, int, text, uuid) to authenticated;
grant execute on function public.deduct_product_stock(text, int, uuid, uuid) to authenticated;
grant execute on function public.check_order_stock(jsonb) to authenticated;

-- Vue alertes stock bas (admin)
create or replace view public.low_stock_products as
select
  id,
  slug,
  name,
  coalesce(stock_quantity, 0) as stock_quantity,
  coalesce(min_stock_alert, 10) as min_stock_alert,
  greatest(0, coalesce(min_stock_alert, 10) - coalesce(stock_quantity, 0)) as units_to_reorder
from public.products
where active = true
  and coalesce(stock_quantity, 0) <= coalesce(min_stock_alert, 10);

grant select on public.low_stock_products to authenticated;
