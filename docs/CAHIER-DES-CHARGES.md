# Cahier des charges — HB Commerce

> **Document consolidé :** l'intégralité des fonctionnalités, règles métier et règles techniques demandées est désormais centralisée dans :
>
> **[FONCTIONNALITES-ET-REGLES-DEMANDEES.md](FONCTIONNALITES-ET-REGLES-DEMANDEES.md)** (document maître v1.4)

Ce fichier reste le point d'entrée pour l'export Word (`cahier-des-charges-hb-commerce.docx`) via `python scripts/generate-docs.py`.

---

## Résumé exécutif

**HB Commerce** — plateforme B2B vente en gros alimentaire multi-marques (FIAFI, TOUNSI, …), hébergée sur GitHub Pages avec backend Supabase.

**Site demo :** https://hbconsultingsrv-arch.github.io/hb-commerce/  
**Mot de passe demo :** `Test1234!`  
**Seed SQL :** `supabase/seed-demo-data.sql`

### Rôles

Super root · Admin · Agent commercial · Client · Fournisseur · Société en attente

### Points clés validés

- Dashboards séparés (super root = internes, admin = opérations)
- Accueil multi-marques, catalogue 100 % Supabase
- Fiches produit : acidité, pays, dispo, fiche technique
- Chat modéré par société
- Suivi livraison en modale admin
- Demo 14 produits / 6 marques / 10 comptes

**Détail complet →** [FONCTIONNALITES-ET-REGLES-DEMANDEES.md](FONCTIONNALITES-ET-REGLES-DEMANDEES.md)

---

*HB Groupe — 19/06/2026*
