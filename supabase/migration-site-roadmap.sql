-- Suivi construction du site HB Commerce (roadmap admin)
-- À exécuter après schema.sql

create table if not exists public.site_roadmap_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general' check (
    category in ('front', 'admin', 'auth', 'stock', 'legal', 'infra', 'general')
  ),
  title text not null,
  notes text,
  status text not null default 'todo' check (
    status in ('done', 'in_progress', 'todo')
  ),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_roadmap_items_status_idx on public.site_roadmap_items (status);
create index if not exists site_roadmap_items_category_idx on public.site_roadmap_items (category);
create index if not exists site_roadmap_items_sort_idx on public.site_roadmap_items (sort_order asc);

alter table public.site_roadmap_items enable row level security;

drop policy if exists "Admin read site roadmap" on public.site_roadmap_items;
drop policy if exists "Admin insert site roadmap" on public.site_roadmap_items;
drop policy if exists "Admin update site roadmap" on public.site_roadmap_items;
drop policy if exists "Admin delete site roadmap" on public.site_roadmap_items;

create policy "Admin read site roadmap" on public.site_roadmap_items
  for select using (public.is_admin());

create policy "Admin insert site roadmap" on public.site_roadmap_items
  for insert with check (public.is_admin());

create policy "Admin update site roadmap" on public.site_roadmap_items
  for update using (public.is_admin());

create policy "Admin delete site roadmap" on public.site_roadmap_items
  for delete using (public.is_admin());

drop trigger if exists site_roadmap_items_updated_at on public.site_roadmap_items;
create trigger site_roadmap_items_updated_at before update on public.site_roadmap_items
  for each row execute procedure public.set_updated_at();

-- Éléments existants au lancement (ignorés si déjà présents)
insert into public.site_roadmap_items (category, title, notes, status, sort_order)
select * from (values
  ('front', 'Page d''accueil premium B2B', 'Hero 3D, catalogue, sections confiance, paiements, FAQ, devis', 'done', 10),
  ('front', 'Catalogue produits & filtres', 'Cartes premium, stock, multi-marques FR/LU', 'done', 20),
  ('front', 'Mode clair / sombre accueil', 'Bouton thème avec mémorisation', 'done', 30),
  ('front', 'Pages légales & paiement', 'CGV, confidentialité, paiement-facturation', 'done', 40),
  ('auth', 'Inscription client 3 étapes', 'Wizard premium, validation société', 'done', 50),
  ('auth', 'Connexion & espace compte', 'Dashboard client, panier, commandes', 'done', 60),
  ('admin', 'Admin v2 — tableau de bord', 'KPIs, graphiques ventes', 'done', 70),
  ('admin', 'Gestion produits & images', 'CRUD, upload Supabase Storage', 'done', 80),
  ('admin', 'Clients & fournisseurs séparés', 'Comptes distincts, création admin', 'done', 90),
  ('admin', 'Stock, achats & incidents', 'Casse, pertes, réception dépôt', 'done', 100),
  ('admin', 'Analyses gains / dépenses', 'Ledger auto + dépenses manuelles', 'done', 110),
  ('admin', 'Support chat clients', 'Modération, réponses admin', 'done', 120),
  ('stock', 'Espace fournisseur lecture seule', 'Consultation stock et commandes', 'done', 130),
  ('infra', 'Migrations Supabase stock', 'RPC, alertes, mouvements', 'done', 140),
  ('infra', 'Paiement Stripe checkout', 'Intégration à finaliser si besoin', 'in_progress', 200),
  ('front', 'Optimisation mobile avancée', 'Tests responsive approfondis', 'todo', 300),
  ('admin', 'Export PDF factures / BL', 'Génération automatique améliorée', 'todo', 310),
  ('infra', 'Notifications e-mail commandes', 'Alertes admin et client', 'todo', 320)
) as seed(category, title, notes, status, sort_order)
where not exists (select 1 from public.site_roadmap_items limit 1);
