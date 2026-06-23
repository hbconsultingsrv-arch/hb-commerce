-- Gestion stock dépôt HB Commerce — achats fournisseur, alertes, mouvements
-- Exécuter dans Supabase SQL Editor après les migrations existantes.
-- Optionnel : créer un bucket Storage public "purchase-invoices" pour les fichiers facture.

-- ── Stock dépôt sur products ────────────────────────────────────────────────
alter table public.products
  add column if not exists stock_quantity int default 0 check (stock_quantity >= 0);

alter table public.products
  add column if not exists min_stock_alert int default 10 check (min_stock_alert >= 0);

-- ── Enrichissement commandes fournisseur (achat admin) ──────────────────────
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

-- ── Mouvements stock ────────────────────────────────────────────────────────
create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_slug text not null,
  product_id uuid references public.products(id) on delete set null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment')),
  quantity_delta int not null,
  quantity_after int not null check (quantity_after >= 0),
  order_id uuid references public.orders(id) on delete set null,
  supplier_order_id uuid references public.supplier_orders(id) on delete set null,
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

-- ── Alertes stock (admin / super) ───────────────────────────────────────────
create table if not exists public.stock_alerts (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade,
  product_slug text not null,
  product_name text,
  alert_type text not null default 'low_stock'
    check (alert_type in ('low_stock', 'out_of_stock')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  stock_quantity int default 0,
  min_stock_alert int default 10,
  created_at timestamptz default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null
);

create index if not exists stock_alerts_status_idx on public.stock_alerts (status, created_at desc);
create index if not exists stock_alerts_slug_idx on public.stock_alerts (product_slug);

alter table public.stock_alerts enable row level security;

drop policy if exists "Admin read stock alerts" on public.stock_alerts;
drop policy if exists "Admin update stock alerts" on public.stock_alerts;
drop policy if exists "Admin insert stock alerts" on public.stock_alerts;

create policy "Admin read stock alerts" on public.stock_alerts
  for select using (public.is_admin());

create policy "Admin update stock alerts" on public.stock_alerts
  for update using (public.is_admin());

create policy "Admin insert stock alerts" on public.stock_alerts
  for insert with check (public.is_admin());

-- ── RPC réception manuelle ──────────────────────────────────────────────────
create or replace function public.receive_product_stock(
  p_slug text,
  p_qty int,
  p_notes text default null,
  p_user_id uuid default auth.uid(),
  p_supplier_order_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_qty int;
  pid uuid;
  pname text;
  min_alert int;
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
  returning stock_quantity, id, name, min_stock_alert into new_qty, pid, pname, min_alert;

  if not found then
    raise exception 'Produit introuvable : %', p_slug;
  end if;

  insert into public.stock_movements (
    product_slug, product_id, movement_type, quantity_delta, quantity_after,
    notes, created_by, supplier_order_id
  ) values (
    p_slug, pid, 'purchase', p_qty, new_qty, p_notes, p_user_id, p_supplier_order_id
  );

  perform public.sync_stock_alerts_for_product(pid, p_slug, pname, new_qty, min_alert);

  return new_qty;
end;
$$;

-- ── RPC déduction vente ─────────────────────────────────────────────────────
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
  pname text;
  min_alert int;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantité invalide';
  end if;

  select stock_quantity, id, name, min_stock_alert
  into current_qty, pid, pname, min_alert
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

  update public.products set stock_quantity = new_qty where slug = p_slug;

  insert into public.stock_movements (
    product_slug, product_id, movement_type, quantity_delta, quantity_after, order_id, created_by
  ) values (
    p_slug, pid, 'sale', -p_qty, new_qty, p_order_id, p_user_id
  );

  perform public.sync_stock_alerts_for_product(pid, p_slug, pname, new_qty, min_alert);

  return new_qty;
end;
$$;

-- ── Vérification panier ─────────────────────────────────────────────────────
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

-- ── Sync alertes ────────────────────────────────────────────────────────────
create or replace function public.sync_stock_alerts_for_product(
  p_product_id uuid,
  p_slug text,
  p_name text,
  p_qty int,
  p_min int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  alert_msg text;
  alert_kind text;
begin
  if p_qty <= 0 then
    alert_kind := 'out_of_stock';
    alert_msg := format('Rupture de stock — %s (0 unité)', coalesce(p_name, p_slug));
  elsif p_qty <= coalesce(p_min, 10) then
    alert_kind := 'low_stock';
    alert_msg := format(
      'Stock bas — %s : %s unité(s) restante(s) (seuil %s)',
      coalesce(p_name, p_slug), p_qty, coalesce(p_min, 10)
    );
  else
    update public.stock_alerts
    set status = 'closed', closed_at = now()
    where product_slug = p_slug and status = 'open';
    return;
  end if;

  if exists (
    select 1 from public.stock_alerts
    where product_slug = p_slug and status = 'open' and alert_type = alert_kind
  ) then
    update public.stock_alerts
    set stock_quantity = p_qty,
        min_stock_alert = coalesce(p_min, 10),
        message = alert_msg
    where product_slug = p_slug and status = 'open' and alert_type = alert_kind;
  else
    insert into public.stock_alerts (
      product_id, product_slug, product_name, alert_type, message,
      stock_quantity, min_stock_alert, status
    ) values (
      p_product_id, p_slug, p_name, alert_kind, alert_msg,
      p_qty, coalesce(p_min, 10), 'open'
    );
  end if;
end;
$$;

-- ── Réception achat fournisseur au dépôt (stock + uniquement ici) ───────────
create or replace function public.receive_supplier_order_at_depot(p_order_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.supplier_orders%rowtype;
  new_qty int;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé';
  end if;

  select * into ord
  from public.supplier_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Commande fournisseur introuvable';
  end if;

  if ord.depot_received then
    raise exception 'Cette commande a déjà été réceptionnée au dépôt';
  end if;

  if ord.status = 'cancelled' then
    raise exception 'Commande annulée';
  end if;

  new_qty := public.receive_product_stock(
    ord.product_slug,
    ord.quantity,
    format('Réception dépôt — commande fournisseur %s', left(ord.id::text, 8)),
    auth.uid(),
    ord.id
  );

  update public.supplier_orders
  set status = 'received',
      depot_received = true,
      depot_received_at = now(),
      depot_received_by = auth.uid(),
      updated_at = now()
  where id = p_order_id;

  return new_qty;
end;
$$;

grant execute on function public.receive_product_stock(text, int, text, uuid, uuid) to authenticated;
grant execute on function public.deduct_product_stock(text, int, uuid, uuid) to authenticated;
grant execute on function public.check_order_stock(jsonb) to authenticated;
grant execute on function public.receive_supplier_order_at_depot(uuid) to authenticated;

-- Vue stock bas
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

-- Réapprovisionnements en cours (date estimée catalogue)
create or replace view public.pending_restock_orders as
select
  product_slug,
  min(expected_arrival_date) filter (where expected_arrival_date is not null) as next_arrival_date,
  sum(quantity) as incoming_quantity
from public.supplier_orders
where depot_received = false
  and status in ('requested', 'accepted', 'in_preparation', 'shipped')
group by product_slug;

grant select on public.pending_restock_orders to authenticated;
