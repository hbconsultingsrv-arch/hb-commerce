-- Module Négociation Commerciale B2B — HB Commerce

create table if not exists public.negotiation_discount_rules (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  min_quantity numeric(12, 2) not null default 0,
  max_quantity numeric(12, 2),
  discount_percent numeric(5, 2) not null default 0,
  requires_approval boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.negotiations (
  id uuid default gen_random_uuid() primary key,
  ref text not null unique,
  client_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  catalog_price numeric(10, 2) not null,
  quantity numeric(12, 2) not null,
  unit text default 'unité',
  client_proposed_price numeric(10, 2),
  commercial_proposed_price numeric(10, 2),
  discount_percent numeric(5, 2),
  discount_fixed numeric(10, 2),
  offer_type text default 'standard' check (
    offer_type in ('standard', 'negotiated', 'percent', 'fixed', 'special')
  ),
  status text not null default 'en_attente' check (
    status in ('en_attente', 'en_discussion', 'offre_envoyee', 'acceptee', 'refusee', 'expiree')
  ),
  message text default '',
  assigned_agent_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  quote_html text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.negotiation_messages (
  id uuid default gen_random_uuid() primary key,
  negotiation_id uuid references public.negotiations(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('client', 'commercial', 'admin', 'system')),
  message text not null default '',
  attachment_url text,
  attachment_name text,
  offer_snapshot jsonb,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_negotiations_client on public.negotiations(client_id);
create index if not exists idx_negotiations_status on public.negotiations(status);
create index if not exists idx_negotiation_messages_neg on public.negotiation_messages(negotiation_id);

alter table public.negotiation_discount_rules enable row level security;
alter table public.negotiations enable row level security;
alter table public.negotiation_messages enable row level security;

-- Règles : lecture tous connectés, écriture admin
create policy "neg_rules_select_auth" on public.negotiation_discount_rules
  for select to authenticated using (true);

create policy "neg_rules_admin_write" on public.negotiation_discount_rules
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_root'))
  );

-- Négociations : client voit les siennes, backoffice voit tout
create policy "neg_select_own_or_backoffice" on public.negotiations
  for select using (
    client_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid()
      and p.role in ('admin', 'super_root', 'agent_commercial')
    )
  );

create policy "neg_insert_client" on public.negotiations
  for insert with check (client_id = auth.uid());

create policy "neg_update_backoffice_or_client_accept" on public.negotiations
  for update using (
    client_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid()
      and p.role in ('admin', 'super_root', 'agent_commercial')
    )
  );

-- Messages
create policy "neg_msg_select" on public.negotiation_messages
  for select using (
    exists (
      select 1 from public.negotiations n
      where n.id = negotiation_id
      and (
        n.client_id = auth.uid()
        or exists (
          select 1 from public.profiles p where p.id = auth.uid()
          and p.role in ('admin', 'super_root', 'agent_commercial')
        )
      )
    )
  );

create policy "neg_msg_insert" on public.negotiation_messages
  for insert with check (
    exists (
      select 1 from public.negotiations n
      where n.id = negotiation_id
      and (
        n.client_id = auth.uid()
        or exists (
          select 1 from public.profiles p where p.id = auth.uid()
          and p.role in ('admin', 'super_root', 'agent_commercial')
        )
      )
    )
  );

create or replace function public.negotiation_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists negotiations_updated on public.negotiations;
create trigger negotiations_updated
  before update on public.negotiations
  for each row execute function public.negotiation_touch_updated_at();

drop trigger if exists neg_rules_updated on public.negotiation_discount_rules;
create trigger neg_rules_updated
  before update on public.negotiation_discount_rules
  for each row execute function public.negotiation_touch_updated_at();
