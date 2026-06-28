-- Permet au client de lire le profil de son agent commercial assigné (nom, e-mail, tél.)
-- pour l'affichage contact dans compte.html

drop policy if exists "Client read assigned commercial agent" on public.profiles;

create policy "Client read assigned commercial agent" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles client
      where client.id = auth.uid()
        and client.commercial_agent_id = profiles.id
    )
  );
