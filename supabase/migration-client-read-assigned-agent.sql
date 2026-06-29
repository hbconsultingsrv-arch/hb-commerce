-- Permet au client de lire le profil de son agent commercial assigné (nom, e-mail, tél.)
-- pour l'affichage contact dans compte.html

create or replace function public.client_assigned_agent_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select commercial_agent_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

drop policy if exists "Client read assigned commercial agent" on public.profiles;

create policy "Client read assigned commercial agent" on public.profiles
  for select using (
    public.client_assigned_agent_id() is not null
    and id = public.client_assigned_agent_id()
  );
