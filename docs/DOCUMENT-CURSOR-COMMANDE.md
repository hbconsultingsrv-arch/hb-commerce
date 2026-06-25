# Document Cursor — Commandes & actions HB Commerce

Journal des demandes et actions réalisées via **Cursor** sur le projet **HB Commerce** (plateforme B2B huile d'olive).

> **Dernière mise à jour :** 25 juin 2026  
> **Dépôt :** [hbconsultingsrv-arch/hb-commerce](https://github.com/hbconsultingsrv-arch/hb-commerce)

---

## Comment utiliser ce document

| Colonne | Signification |
|---------|---------------|
| **#** | Numéro de demande |
| **Date** | Période de la demande |
| **Demande** | Ce qui a été demandé |
| **Action réalisée** | Fichiers / fonctionnalités livrés |
| **Branche / commit** | Où retrouver le code (si connu) |

---

## 1. Suivi de commande client

| | |
|---|---|
| **Demande** | Page de suivi de commande avec timeline, liste des commandes, historique, polling temps réel |
| **Action** | `suivi-commande.html`, `js/order-tracking.js`, `css/order-tracking.css` — timeline 7 étapes, actualisation 30 s |
| **Intégration** | Liens depuis `compte.html`, `index.html`, `auth.js` (`updateNavAuth`) |

---

## 2. Module Qualité (QA) complet

| | |
|---|---|
| **Demande** | Module QA : exigences, plan de test, traçabilité, rapports, tests Playwright |
| **Action** | `qa.html`, `js/qa-api.js`, `js/qa-main.js`, `css/qa-shell.css`, `tests/*.spec.ts`, `qa-runner/server.mjs`, migrations SQL |
| **Branche** | `feature/module-qa` |

---

## 3. Module Négociation commerciale B2B

| | |
|---|---|
| **Demande** | Négociation B2B intégrée aux fiches produits (offres, messagerie, conversion) |
| **Action** | `negociations.html`, `js/negotiation-*.js`, `css/negotiation.css`, migrations Supabase |
| **Branche** | `feature/module-negotiation` |

---

## 4. Dashboard Admin — Construction du site (centre de pilotage)

| | |
|---|---|
| **Demande** | Enrichir la section « Construction du site » : KPI, barres par catégorie, roadmap visuelle, filtres priorité, graphiques, indicateurs projet |
| **Action** | `js/admin-roadmap.js` (réécrit), `css/admin-roadmap.css`, panneaux HTML dans `admin.html` (`#roadmapKpiHost`, timeline, graphiques, filtres) |
| **Catégories** | Frontend, Backend, Auth, Produits, Commandes, Fournisseurs, Paiements, Messagerie, Négociation, Dashboard, Tests QA |

---

## 5. Menu admin « Tests QA »

| | |
|---|---|
| **Demande** | Bouton dans le menu principal admin vers le module qualité |
| **Action** | Lien sidebar `Tests QA` → `qa.html` dans `admin.html` |

---

## 6. Dashboard QA enrichi (centre de contrôle qualité)

| | |
|---|---|
| **Demande** | KPI complets, exécution rapide (tous / échoués / critiques), tableau résultats, couverture fonctionnelle, alertes, historique, graphiques, intégration modules |
| **Action** | `qa.html`, `js/qa-main.js`, `js/qa-api.js`, `qa-runner/server.mjs` (modes `all`, `failed`, `critical`) |
| **Branche** | `feature/admin-dashboard-qa` — commit `6a1df63` |

---

## 7. Push GitHub

| | |
|---|---|
| **Demande** | « push le » — pousser les changements dashboard / QA |
| **Action** | Branche `feature/admin-dashboard-qa` poussée sur `origin` |
| **PR** | https://github.com/hbconsultingsrv-arch/hb-commerce/pull/new/feature/admin-dashboard-qa |

---

## 8. Document Cursor + espace livreur

| | |
|---|---|
| **Demande** | Créer ce document récapitulatif sur GitHub ; ajouter connexion et page pour les **livreurs** (clients livraison) |
| **Action** | `docs/DOCUMENT-CURSOR-COMMANDE.md`, `livreur.html`, `login-livreur.html`, `js/livreur.js`, `js/driver-api.js`, `css/livreur.css`, `supabase/migration-delivery-drivers.sql`, panneau admin Livreurs |
| **Branche** | `feature/livreur-livraison` |

---

## Commandes utiles (développement local)

```bash
# Site statique
python -m http.server 8080

# Runner QA Playwright
npm run qa:server

# Tests
npm test
```

---

## Fichiers clés par domaine

| Domaine | Fichiers principaux |
|---------|---------------------|
| Auth & rôles | `js/auth.js`, `login.html`, `register.html` |
| Client | `compte.html`, `suivi-commande.html`, `js/dashboard.js` |
| Admin | `admin.html`, `js/admin.js`, `js/admin-api.js` |
| QA | `qa.html`, `js/qa-main.js`, `js/qa-api.js` |
| Livraison livreur | `livreur.html`, `login-livreur.html`, `js/livreur.js`, `js/driver-api.js` |
| Négociation | `negociations.html`, `js/negotiation-api.js` |
| Roadmap | `js/admin-roadmap.js`, `css/admin-roadmap.css` |

---

## Rôles utilisateurs (Supabase `profiles.role`)

| Rôle | Espace par défaut |
|------|-------------------|
| `client` | `compte.html` |
| `pending_company` | En attente validation |
| `supplier` | `supplier.html` |
| `livreur` | `livreur.html` |
| `agent_commercial` | `admin.html` |
| `admin` / `super_root` | `admin.html` / `super-root.html` |

---

## Notes

- `js/config.js` est ignoré par Git (clés Supabase locales).
- Exécuter les migrations SQL dans Supabase avant d'utiliser QA, stock, négociation ou livreurs en production.
- Ce document est mis à jour à chaque demande majeure faite à Cursor.
