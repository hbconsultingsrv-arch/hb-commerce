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
| [Cahier des charges (résumé)](CAHIER-DES-CHARGES.md) | Pointeur vers le document maître + résumé exécutif |
| [Cahier des charges (Word)](cahier-des-charges-hb-commerce.docx) | Export Office |
| [Présentation (PowerPoint)](presentation-hb-commerce.pptx) | Slides |
| [Présentation web](presentation/index.html) | Slides interactives |
| [Hub demo](exemples/index.html) | Liens rapides + tableau comptes |

---

## Démarrage rapide demo

**URL :** https://hbconsultingsrv-arch.github.io/hb-commerce/

**Mot de passe :** `Test1234!`

**SQL :** exécuter les migrations listées dans le [document maître §18](FONCTIONNALITES-ET-REGLES-DEMANDEES.md#18-architecture-migrations-et-déploiement), puis `supabase/seed-demo-data.sql`.

**Connexion admin :** `admin@hbcommerce.demo` → [admin.html](../admin.html)

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
