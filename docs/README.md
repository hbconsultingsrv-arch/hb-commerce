# Documentation HB Commerce

## Document maître

**[FONCTIONNALITES-ET-REGLES-DEMANDEES.md](FONCTIONNALITES-ET-REGLES-DEMANDEES.md)** — référence unique pour :

- Toutes les fonctionnalités demandées et implémentées
- Règles métier (rôles, dashboards, chat, catalogue, demo, …)
- Règles techniques (Supabase, CSS admin, interdictions)
- Migrations, comptes demo, pages du site

Les contenus de l'ancien cahier des charges, du README et des pages demo ont été **fusionnés** dans ce fichier.

---

## Autres documents

| Document | Description |
|----------|-------------|
| **[Guide équipe familiale](GUIDE-EQUIPE-FAMILLE.md)** | GitHub, Cursor, Supabase — travailler à plusieurs avec vos comptes |
| [Tests E2E — scénarios Selenium](TESTS-E2E-SCENARIOS.md) | Flux logiques, lancement, CI, rapport Construction |
| [Cahier des charges (résumé)](CAHIER-DES-CHARGES.md) | Pointeur vers le document maître + résumé exécutif |
| [Cahier des charges (Word)](cahier-des-charges-hb-commerce.docx) | Export Office |
| [Présentation (PowerPoint)](presentation-hb-commerce.pptx) | Slides |
| [Présentation web](presentation/index.html) | Slides interactives |
| [CHANGELOG.md](../CHANGELOG.md) | Historique des versions (release **v2.0.0**) |

---

## Démarrage rapide demo

**URL :** https://hbconsultingsrv-arch.github.io/hb-commerce/

**Mot de passe :** `Test1234!`

**SQL :** exécuter les migrations listées dans le [document maître §18](FONCTIONNALITES-ET-REGLES-DEMANDEES.md#18-architecture-migrations-et-déploiement) — en priorité **`migration-livreurs-setup-complete.sql`**, puis **`migration-client-read-assigned-agent.sql`** et **`migration-profile-avatar.sql`** si agent client / avatar — puis `supabase/seed-demo-data.sql`.

**Nouveautés release v2.0.0 :**

- Admin shell v2 (sidebar, topbar, profil sous le logo, mode clair/sombre)
- Super root → `admin.html?tab=equipe` (personnel + rôles)
- Profil cliquable (`compte.html?tab=profil`) pour tous les rôles
- Tests E2E automatisés (CI GitHub Actions)
- Migrations RLS profiles + avatar — voir [CHANGELOG.md](../CHANGELOG.md)

**Connexion super root :** `super@hbcommerce.demo` → [admin.html?tab=equipe](../admin.html?tab=equipe)  
**Connexion admin :** `admin@hbcommerce.demo` → [admin.html](../admin.html)  
**Connexion client :** `contact@restaurant-paris.demo` → [compte.html](../compte.html)

---

## Régénérer les documents Office

```bash
pip install python-pptx
python scripts/generate-docs.py
python scripts/patch-docs-demo.py
```

> Ne pas utiliser `generate-docs.ps1` (supprimé — fichiers corrompus).

---

*HB Commerce — HB Groupe*
