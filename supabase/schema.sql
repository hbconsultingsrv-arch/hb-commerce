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
  siren text,
  vat_number text,
  commercial_agent_id uuid references public.profiles(id),
  role text default 'client' check (role in ('client', 'agent_commercial', 'admin', 'super_root')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'client' where role = 'user';
alter table public.profiles alter column role set default 'client';
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'agent_commercial', 'admin', 'super_root'));
alter table public.profiles add column if not exists siren text;
alter table public.profiles add column if not exists vat_number text;
alter table public.profiles add column if not exists commercial_agent_id uuid references public.profiles(id);

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
    status in ('en_attente', 'validee', 'en_attente_paiement', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee')
  ),
  payment_method text check (payment_method in ('virement', 'stripe', 'cheque')),
  shipping_address text,
  delivery_status text default 'non_preparee' check (
    delivery_status in ('non_preparee', 'preparation', 'prete', 'expediee', 'en_transit', 'livree', 'incident', 'retour')
  ),
  carrier text,
  tracking_number text,
  tracking_url text,
  estimated_delivery_date date,
  delivered_at timestamptz,
  delivery_notes text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('en_attente', 'validee', 'en_attente_paiement', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee')
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

-- Prix personnalises par client/societe
create table if not exists public.customer_prices (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles on delete cascade not null,
  product_slug text not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (profile_id, product_slug)
);

-- Chat societe <-> administration, avec moderation
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.profiles on delete cascade not null,
  author_id uuid references auth.users on delete set null,
  author_role text not null check (author_role in ('client', 'agent_commercial', 'admin', 'super_root')),
  message text not null check (length(trim(message)) > 0),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users on delete set null,
  moderated_at timestamptz,
  created_at timestamptz default now()
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
    where id = auth.uid() and role in ('admin', 'super_root')
  );
$$;

create or replace function public.is_super_root()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_root'
  );
$$;

create or replace function public.is_commercial_agent()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'agent_commercial'
  );
$$;

create or replace function public.is_assigned_commercial_agent(profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and p.role = 'client'
      and p.commercial_agent_id = auth.uid()
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
    and not public.is_super_root()
    and not (
      public.is_admin()
      and old.role in ('client', 'agent_commercial')
      and new.role in ('client', 'agent_commercial')
    )
    and session_user not in ('postgres', 'supabase_admin')
  then
    raise exception 'Seul le super root peut modifier les roles.';
  end if;
  if new.role in ('agent_commercial', 'admin', 'super_root') then
    new.company = 'HB Commerce';
  end if;
  return new;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customer_prices enable row level security;
alter table public.chat_messages enable row level security;

-- Profils (DROP IF EXISTS pour réexécution sans erreur)
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Admin read all profiles" on public.profiles;
drop policy if exists "Admin manage client profiles" on public.profiles;
drop policy if exists "Commercial agent read assigned profiles" on public.profiles;
drop policy if exists "Super root manage profiles" on public.profiles;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Admin read all profiles" on public.profiles for select using (public.is_admin());
create policy "Admin manage client profiles" on public.profiles for all
  using (public.is_admin() and role in ('client', 'agent_commercial'))
  with check (public.is_admin() and role in ('client', 'agent_commercial'));
create policy "Commercial agent read assigned profiles" on public.profiles for select
  using (role = 'client' and commercial_agent_id = auth.uid());
create policy "Super root manage profiles" on public.profiles for all
  using (public.is_super_root()) with check (public.is_super_root());

-- Produits
drop policy if exists "Public read active products" on public.products;
drop policy if exists "Admin manage products" on public.products;

create policy "Public read active products" on public.products for select
  using (active = true or public.is_admin());
create policy "Admin manage products" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- Commandes
drop policy if exists "Users read own orders" on public.orders;
drop policy if exists "Users insert own orders" on public.orders;
drop policy if exists "Admin read all orders" on public.orders;
drop policy if exists "Admin update all orders" on public.orders;
drop policy if exists "Commercial agent read assigned orders" on public.orders;
drop policy if exists "Commercial agent update assigned orders" on public.orders;

create policy "Users read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admin read all orders" on public.orders for select using (public.is_admin());
create policy "Admin update all orders" on public.orders for update using (public.is_admin());
create policy "Commercial agent read assigned orders" on public.orders for select
  using (public.is_assigned_commercial_agent(user_id));
create policy "Commercial agent update assigned orders" on public.orders for update
  using (public.is_assigned_commercial_agent(user_id));

-- Lignes commande
drop policy if exists "Users read own order items" on public.order_items;
drop policy if exists "Users insert own order items" on public.order_items;
drop policy if exists "Admin read all order items" on public.order_items;
drop policy if exists "Admin insert order items" on public.order_items;
drop policy if exists "Commercial agent read assigned order items" on public.order_items;

create policy "Users read own order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Users insert own order items" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Admin read all order items" on public.order_items for select using (public.is_admin());
create policy "Admin insert order items" on public.order_items for insert with check (public.is_admin());
create policy "Commercial agent read assigned order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_assigned_commercial_agent(o.user_id)));

-- Prix personnalises
drop policy if exists "Users read own customer prices" on public.customer_prices;
drop policy if exists "Admin read customer prices" on public.customer_prices;
drop policy if exists "Commercial agent manage assigned customer prices" on public.customer_prices;
drop policy if exists "Super root manage customer prices" on public.customer_prices;

create policy "Users read own customer prices" on public.customer_prices for select
  using (auth.uid() = profile_id);
create policy "Admin read customer prices" on public.customer_prices for select
  using (public.is_admin());
create policy "Commercial agent manage assigned customer prices" on public.customer_prices for all
  using (public.is_admin() or public.is_assigned_commercial_agent(profile_id))
  with check (public.is_admin() or public.is_assigned_commercial_agent(profile_id));
create policy "Super root manage customer prices" on public.customer_prices for all
  using (public.is_super_root()) with check (public.is_super_root());

-- Chat
drop policy if exists "Users read own chat" on public.chat_messages;
drop policy if exists "Users create own chat messages" on public.chat_messages;
drop policy if exists "Admin read all chat" on public.chat_messages;
drop policy if exists "Admin create chat messages" on public.chat_messages;
drop policy if exists "Admin moderate chat messages" on public.chat_messages;
drop policy if exists "Commercial agent read assigned chat" on public.chat_messages;
drop policy if exists "Commercial agent create assigned chat" on public.chat_messages;
drop policy if exists "Commercial agent moderate assigned chat" on public.chat_messages;

create policy "Users read own chat" on public.chat_messages for select using (
  auth.uid() = company_id
  and (
    status = 'approved'
    or (author_id = auth.uid() and status = 'pending')
  )
);
create policy "Users create own chat messages" on public.chat_messages for insert with check (
  auth.uid() = company_id
  and author_id = auth.uid()
  and author_role = 'client'
  and status = 'pending'
);
create policy "Admin read all chat" on public.chat_messages for select using (public.is_admin());
create policy "Admin create chat messages" on public.chat_messages for insert with check (
  public.is_admin()
  and author_id = auth.uid()
  and author_role in ('admin', 'super_root')
  and status = 'approved'
);
create policy "Admin moderate chat messages" on public.chat_messages for update using (public.is_admin());
create policy "Commercial agent read assigned chat" on public.chat_messages for select
  using (public.is_assigned_commercial_agent(company_id));
create policy "Commercial agent create assigned chat" on public.chat_messages for insert with check (
  public.is_assigned_commercial_agent(company_id)
  and author_id = auth.uid()
  and author_role = 'agent_commercial'
  and status = 'approved'
);
create policy "Commercial agent moderate assigned chat" on public.chat_messages for update
  using (public.is_assigned_commercial_agent(company_id));

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, company, address, siren, vat_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'company', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'siren', ''),
    coalesce(new.raw_user_meta_data->>'vat_number', '')
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

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles
  for each row execute procedure public.protect_profile_role();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();

drop trigger if exists customer_prices_updated_at on public.customer_prices;
create trigger customer_prices_updated_at before update on public.customer_prices
  for each row execute procedure public.set_updated_at();

-- Produit phare FIAFI
insert into public.products (name, slug, description, origin, category, price, unit, min_quantity, image_url, tag, sort_order) values
  (
    'FIAFI — Huile d''olive extra vierge',
    'fiafi-huile-olive',
    'Huile d''olive extra vierge de première pression à froid, origine Tunisie. Parfaite pour la restauration et le commerce en gros.',
    'Tunisie',
    'huiles',
    4.50,
    'litre',
    12,
    'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200',
    'Produit phare',
    1
  )
on conflict (slug) do nothing;

-- Promouvoir votre compte principal en super root :
-- update public.profiles set role = 'super_root' where email = 'votre-email@gmail.com';
