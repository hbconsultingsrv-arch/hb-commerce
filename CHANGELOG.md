# Changelog — HB Commerce

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [2.0.0] — 2026-06-19

Première release taguée sur Git. Plateforme B2B demo stable avec admin shell v2, tests E2E CI et documentation consolidée.

### Ajouté

- Admin shell v2 : sidebar, topbar (Mes activités, Menu, thème clair/sombre), profil sous le logo
- Super root intégré dans `admin.html?tab=equipe` (personnel complet + changement de rôles)
- Admin : onglet Équipe HB (agents commerciaux + livreurs)
- Page profil `compte.html?tab=profil` pour tous les rôles internes
- Tests E2E Selenium (GitHub Actions) — ~50 scénarios
- Migrations : `migration-fix-profiles-rls-recursion.sql`, `migration-super-root-bootstrap.sql`, `migration-profile-avatar.sql`

### Modifié

- `super-root.html` → redirection vers `admin.html?tab=equipe`
- Bouton Déconnexion dans la barre horizontale admin
- Enregistrement profil tolérant (sans colonne `avatar_url` ou bucket Storage)
- Navigation auth : bouton Connexion après déconnexion, menu « Mes activités »

### Corrigé

- Récursion RLS infinie sur `profiles` (politique agent commercial assigné)
- Doublon bouton Administration sur `compte.html`
- Menus déroulants admin en mode clair (lisibilité + z-index)
- Équipe HB vide pour super root demo (bootstrap RPC)

[2.0.0]: https://github.com/hbconsultingsrv-arch/hb-commerce/releases/tag/v2.0.0
