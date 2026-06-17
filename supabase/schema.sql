-- HB Commerce — Schéma Supabase
-- Exécuter dans : Supabase Dashboard → SQL Editor

-- Profils utilisateurs (clients professionnels)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  phone text,
  address text,
  company text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Catalogue produits alimentaires
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  origin text,
  category text default 'alimentaire',
  price numeric(10, 2) not null,
  unit text default 'litre',
  min_quantity int default 1,
  image_url text not null,
  tag text,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Commandes
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  total numeric(10, 2) not null,
  status text default 'en_attente' check (
    status in ('en_attente', 'en_attente_paiement', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee')
  ),
  payment_method text check (payment_method in ('virement', 'stripe', 'cheque')),
  shipping_address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lignes de commande
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders on delete cascade not null,
  product_id text not null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  unit text default 'litre'
);

-- Fonction admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profils
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Admin read all profiles" on public.profiles for select using (public.is_admin());

-- Produits : lecture publique (actifs) ou admin (tous)
create policy "Public read active products" on public.products for select
  using (active = true or public.is_admin());
create policy "Admin manage products" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- Commandes : client lit/crée ses commandes, admin lit/modifie toutes
create policy "Users read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admin read all orders" on public.orders for select using (public.is_admin());
create policy "Admin update all orders" on public.orders for update using (public.is_admin());

-- Lignes commande
create policy "Users read own order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Users insert own order items" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Admin read all order items" on public.order_items for select using (public.is_admin());
create policy "Admin insert order items" on public.order_items for insert with check (public.is_admin());

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, company)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Mise à jour updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();

-- Produit phare FAYAFI
insert into public.products (name, slug, description, origin, category, price, unit, min_quantity, image_url, tag, sort_order) values
  (
    'FAYAFI — Huile d''olive extra vierge',
    'fayafi-huile-olive',
    'Huile d''olive extra vierge de première pression à froid, origine Tunisie. Parfaite pour la restauration et le commerce en gros.',
    'Tunisie',
    'huiles',
    4.50,
    'litre',
    12,
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=85&auto=format&fit=crop',
    'Produit phare',
    1
  )
on conflict (slug) do nothing;

-- Promouvoir votre compte en admin :
-- update public.profiles set role = 'admin' where email = 'votre-email@gmail.com';
