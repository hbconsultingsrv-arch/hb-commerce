-- Agents commerciaux assignes aux clients
-- Executer dans Supabase SQL Editor sur une base existante.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'agent_commercial', 'admin', 'super_root'));
alter table public.profiles add column if not exists commercial_agent_id uuid references public.profiles(id);

alter table public.chat_messages drop constraint if exists chat_messages_author_role_check;
alter table public.chat_messages add constraint chat_messages_author_role_check
  check (author_role in ('client', 'agent_commercial', 'admin', 'super_root'));

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

drop policy if exists "Admin manage client profiles" on public.profiles;
drop policy if exists "Commercial agent read assigned profiles" on public.profiles;
create policy "Admin manage client profiles" on public.profiles for all
  using (public.is_admin() and role in ('client', 'agent_commercial'))
  with check (public.is_admin() and role in ('client', 'agent_commercial'));
create policy "Commercial agent read assigned profiles" on public.profiles for select
  using (role = 'client' and commercial_agent_id = auth.uid());

drop policy if exists "Commercial agent read assigned orders" on public.orders;
drop policy if exists "Commercial agent update assigned orders" on public.orders;
create policy "Commercial agent read assigned orders" on public.orders for select
  using (public.is_assigned_commercial_agent(user_id));
create policy "Commercial agent update assigned orders" on public.orders for update
  using (public.is_assigned_commercial_agent(user_id));

drop policy if exists "Commercial agent read assigned order items" on public.order_items;
create policy "Commercial agent read assigned order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_assigned_commercial_agent(o.user_id)));

drop policy if exists "Commercial agent manage assigned customer prices" on public.customer_prices;
create policy "Commercial agent manage assigned customer prices" on public.customer_prices for all
  using (public.is_admin() or public.is_assigned_commercial_agent(profile_id))
  with check (public.is_admin() or public.is_assigned_commercial_agent(profile_id));

drop policy if exists "Commercial agent read assigned chat" on public.chat_messages;
drop policy if exists "Commercial agent create assigned chat" on public.chat_messages;
drop policy if exists "Commercial agent moderate assigned chat" on public.chat_messages;
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
