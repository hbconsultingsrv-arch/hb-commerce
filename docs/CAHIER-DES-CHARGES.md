# Cahier des charges — HB Commerce

> **Document consolidé :** l'intégralité des fonctionnalités, règles métier et règles techniques demandées est désormais centralisée dans :
>
> **[FONCTIONNALITES-ET-REGLES-DEMANDEES.md](FONCTIONNALITES-ET-REGLES-DEMANDEES.md)** (document maître **v1.8**)

Ce fichier reste le point d'entrée pour l'export Word (`cahier-des-charges-hb-commerce.docx`) via `python scripts/generate-docs.py`.

---

## Résumé exécutif

**HB Commerce** — plateforme B2B vente en gros alimentaire multi-marques (FIAFI, TOUNSI, …), hébergée sur GitHub Pages avec backend Supabase.

**Site demo :** https://hbconsultingsrv-arch.github.io/hb-commerce/  
**Mot de passe demo :** `Test1234!`  
**Seed SQL :** `supabase/seed-demo-data.sql`

### Rôles

Super root · Admin · Agent commercial · Client · Fournisseur · Livreur · Société en attente

### Points clés validés (30/06/2026)

- Dashboards séparés : **Super root** (comptes HB + livreur) · **Admin RH** · **`agent.html`** (portefeuille) · Client · Fournisseur · Livreur
- Agent : **créer client**, **créer commande** (visible client + agent), **logistique** (dates, livreur)
- Accueil multi-marques, catalogue 100 % Supabase, nav menu **Plus**, i18n **FR / DE / EN**
- Chat modéré par société ; suivi livraison en modale
- Migration livreurs : **`migration-livreurs-setup-complete.sql`** (recommandé)
- Demo 14 produits / 6 marques / 11 comptes

**Détail complet →** [FONCTIONNALITES-ET-REGLES-DEMANDEES.md](FONCTIONNALITES-ET-REGLES-DEMANDEES.md)

---

*HB Groupe — 30/06/2026*
