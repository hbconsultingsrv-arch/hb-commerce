# Fonctionnalités et règles — HB Commerce (document maître)

**Projet :** HB Commerce — HB Groupe  
**Dernière mise à jour :** 30/06/2026  
**Site demo :** https://hbconsultingsrv-arch.github.io/hb-commerce/

Ce document **fusionne et remplace** le contenu fonctionnel/règles des fichiers :

- `docs/CAHIER-DES-CHARGES.md` (référence produit)
- `docs/README.md` (comptes demo, migrations, scripts)
- `docs/exemples/index.html` et `docs/presentation/index.html` (règles demo)

> **Exports Office :** régénérer Word/PPT via `python scripts/generate-docs.py` (ne pas utiliser l'ancien script PowerShell supprimé).

---

## Tableau d'évolution

| Version | Date | Modification |
|---------|------|--------------|
| 1.0 | 18/06/2026 | Création plateforme B2B FIAFI |
| 1.1 | 18/06/2026 | Fournisseurs, stock, agents, factures |
| 1.2 | 19/06/2026 | Demo, modération chat, pages d'exemple |
| 1.3 | 19/06/2026 | Accueil multi-marques, fiches produit, catalogue 100 % Supabase |
| 1.4 | 19/06/2026 | Fusion documentation fonctionnelle (ce document) |
| 1.5 | 19/06/2026 | Espace livreur (Mohamed), assignation courses, seed demo |
| 1.6 | 30/06/2026 | Séparation espace agent (`agent.html`) / admin RH, i18n FR·DE·EN, nav « Plus » |
| 1.7 | 30/06/2026 | Agent : créer client, créer commande client, logistique livraison, livreur dans Super root |
| 1.8 | 30/06/2026 | Migrations livreurs consolidées, redirection rôles métier hors `compte.html` |

---

## Sommaire

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Périmètre fonctionnel global](#2-périmètre-fonctionnel-global)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Organisation des dashboards](#4-organisation-des-dashboards)
5. [Parcours client B2B](#5-parcours-client-b2b)
6. [Page d'accueil HB Commerce](#6-page-daccueil-hb-commerce)
7. [Catalogue produits (Supabase uniquement)](#7-catalogue-produits-supabase-uniquement)
8. [Fiches produit (site public)](#8-fiches-produit-site-public)
9. [Prix, panier et paiement](#9-prix-panier-et-paiement)
10. [Agents commerciaux](#10-agents-commerciaux)
11. [Fournisseurs, stock et achats](#11-fournisseurs-stock-et-achats)
12. [Commandes, factures et livraison](#12-commandes-factures-et-livraison)
13. [Chat et modération](#13-chat-et-modération)
14. [Suivi construction du site (admin)](#14-suivi-construction-du-site-admin)
15. [Analyses financières (admin)](#15-analyses-financières-admin)
16. [Environnement de démonstration](#16-environnement-de-démonstration)
17. [Pages du site et hub demo](#17-pages-du-site-et-hub-demo)
18. [Architecture, migrations et déploiement](#18-architecture-migrations-et-déploiement)
19. [Documentation et présentation](#19-documentation-et-présentation)
20. [Règles techniques impératives](#20-règles-techniques-impératives)
21. [Interdictions / à ne pas refaire](#21-interdictions--à-ne-pas-refaire)
22. [Fichiers clés](#22-fichiers-clés)

---

## 1. Contexte et objectifs

HB Commerce est une plateforme **B2B de vente en gros alimentaire**, initialement centrée sur l'huile **FIAFI** (origine Tunisie), étendue en **multi-marques** (FIAFI, TOUNSI, épicerie fine, etc.).

**Objectifs :**

- Digitaliser le parcours professionnel : catalogue, commande, facturation, livraison
- Relation commerciale via agents assignés et chat modéré
- Back-office complet (admin RH, super root, espace agent, fournisseur, livreur)
- Site vitrine multi-marques ; langues UI **FR / DE / EN** (plus de sélecteur pays LU/FR dans la navigation)

---

## 2. Périmètre fonctionnel global

| Domaine | Fonctionnalités |
|---------|-----------------|
| Vitrine | Accueil HB Commerce, catalogue, brochures marché FR/LU, nav simplifiée + menu **Plus** |
| Commerce | Panier, checkout, prix masqués avant connexion |
| Client | Profil société, commandes (y compris celles saisies par l'agent), factures PDF, chat |
| Agent commercial | Espace dédié `agent.html` : clients assignés, **création commande**, logistique, livreur, chat, stock lecture seule |
| Admin (RH) | Produits, fournisseurs, stock, **Équipe HB** (agents + livreurs), sociétés, commandes, chat, analyses, construction |
| Super root | Comptes internes HB + **création livreur** ; lien vers admin pour opérations |
| Fournisseur | Stock et commandes d'approvisionnement reçues |
| Livreur | Courses assignées, mise à jour statuts livraison |

---

## 3. Rôles et permissions

| Rôle | Code | Accès principal |
|------|------|-----------------|
| Super root | `super_root` | Utilisateurs internes (super root, admin, agent) + **livreur** ; promotion rôles |
| Admin | `admin` | Opérations RH : catalogue, sociétés, commandes, **Équipe HB**, stock, analyses |
| Agent commercial | `agent_commercial` | Espace **`agent.html`** : clients **assignés**, **commandes**, **logistique/livreur**, chat, prix |
| Client | `client` | Catalogue, commandes, chat société |
| Fournisseur | `supplier` | Stock fournisseur, commandes reçues |
| Livreur | `livreur` | Courses assignées, mise à jour livraison (`livreur.html`) |
| Société en attente | `pending_company` | Compte créé, validation admin requise |

**Redirection après connexion (`getDefaultDashboardUrl`) :**

| Rôle | Page d'accueil |
|------|----------------|
| `super_root` | `super-root.html` |
| `admin` | `admin.html` |
| `agent_commercial` | **`agent.html`** (plus `admin.html` pour un agent pur) |
| `livreur` | `livreur.html` |
| `supplier` | `supplier.html` |
| `client` / `pending_company` | `compte.html` |

Les rôles métier (**agent, livreur, fournisseur, admin, super root**) ne restent **pas** sur `compte.html` — redirection automatique.

**Règles RLS (Supabase) :**

- Le **super root** crée/modifie les comptes internes (`super_root`, `admin`, `agent_commercial`) et peut créer un **livreur** (profil + fiche `delivery_drivers`)
- L'**admin** gère les sociétés clients/fournisseurs, l'**Équipe HB** (agents + livreurs) et les opérations
- Un **agent** ne voit que les clients liés via `commercial_agent_id` ; peut **insérer une commande** pour ces clients (migration dédiée)
- Un **agent** peut **lire** la liste des livreurs et **assigner** un livreur sur les commandes de son périmètre
- Un **fournisseur** ne voit que son entité (`supplier_id`)
- Un **livreur** ne voit que les commandes où `assigned_driver_id` = son `driver_id`

---

## 4. Organisation des dashboards

### Règle : séparation RH / agent / super root

| Page | Rôles | Périmètre |
|------|-------|-----------|
| `super-root.html` | `super_root` | Comptes HB : super root, admin, agent, **livreur** |
| `admin.html` | `admin`, `super_root` (RH) | Opérations **globales** : catalogue, stock, Équipe HB, analyses… |
| **`agent.html`** | **`agent_commercial`**, admin/super (activité commerciale perso) | Portefeuille **assigné uniquement** |
| `supplier.html` | `supplier` | Stock et approvisionnement |
| `livreur.html` | `livreur` | Courses et statuts livraison |
| `compte.html` | `client`, `pending_company` | Espace société cliente |

- Un **agent commercial pur** est redirigé de `admin.html` vers **`agent.html`**
- Admin / super root peuvent ouvrir **`agent.html`** pour leur propre portefeuille commercial (lien « Mon activité commerciale »)
- Le super root **ne gère pas** le catalogue au quotidien → **`admin.html`**
- Création **livreur** : Super root (rôle Livreur) **ou** Admin → **Équipe HB → Livreurs**

### Onglets admin (`admin.html`) — espace RH

Navigation latérale + sous-onglets :

| Onglet | Accès | Contenu |
|--------|-------|---------|
| Tableau de bord | Admin | Vue d'ensemble |
| Produits | Admin | CRUD catalogue |
| Fournisseurs | Admin | Entités fournisseurs |
| Stock & achats | Admin | Stock, commandes fournisseur |
| **Équipe HB** | Admin | Sous-onglets **Agents commerciaux** · **Livreurs** (création + liste) |
| Commandes | Admin | Toutes commandes clients + suivi livraison |
| Clients | Admin | Sociétés clientes |
| Prix clients | Admin | Tarifs personnalisés |
| Analyses | Admin | Analyses financières |
| Construction | Admin | Roadmap / avancement site |
| Support (chat) | Admin | Chat par société + modération |

**Lien direct Équipe :** `admin.html?tab=equipe` · Livreurs : `admin.html?tab=equipe&section=livreurs`

### Onglets espace agent (`agent.html`)

| Onglet | Contenu |
|--------|---------|
| Accueil | Synthèse activité (commandes, clients, alertes stock) |
| **Mes commandes** | Liste + sous-onglet **Créer une commande** ; statut commande ; **Suivi / livreur** |
| Mes clients | Liste + **Créer un client** (assigné automatiquement à l'agent) |
| Prix clients | Tarifs négociés pour le portefeuille |
| Stock | **Lecture seule** — alertes visibles, pas de modification RH |
| Support (chat) | Chat des sociétés assignées |

**Règle commande agent :** la commande est enregistrée avec `user_id` = **client** → visible dans **`compte.html`** (client) et **`agent.html`** (agent).

**Règle logistique agent :** via modale **Suivi / livreur** — date estimée, statut livraison, transporteur, suivi, **assignation livreur** (liste chargée depuis `delivery_drivers`).

**Règle CSS obligatoire** (panneaux masqués) :

```css
.admin-panel[hidden] { display: none !important; }
```

Sans cela, `display: flex` sur `.admin-panel` écrase l'attribut HTML `hidden`.

**Visibilité :** éléments `.admin-only` = réservés au rôle `admin` (masqués pour agents).

### Dashboard super root

| Onglet | Contenu |
|--------|---------|
| **Équipe** | Liste super root / admin / agents / **livreurs** |
| **Nouveau** | Création compte — rôles : Agent commercial, Admin, Super root, **Livreur** |

- **Livreur (Super root) :** champ véhicule optionnel ; crée fiche `delivery_drivers` + compte Auth
- **Supprimé :** onglet « Modifier » dédié → modification via **bouton fin de ligne** + **modale**
- **Aide :** bouton ouvrant `#superRootInfoModal` — renvoie vers `admin.html?tab=equipe` pour détail agents/livreurs

---

## 5. Parcours client B2B

1. **Inscription** société → `register.html` (rôle initial `pending_company`)
2. **Validation** admin → passage en `client`
3. **Connexion** → `login.html`
4. **Catalogue** → `produits.html` (prix visibles si connecté client)
5. **Panier** → `panier.html`
6. **Checkout** → `checkout.html` (adresse, paiement)
7. **Suivi** → `compte.html` (commandes, factures, chat)

---

## 6. Page d'accueil HB Commerce

### Sections obligatoires (`index.html`)

| Section | ID | Contenu |
|---------|-----|---------|
| Hero | `#accueil` | HB Commerce, multi-marques, pills dynamiques, CTA |
| Catalogue actif | panneau hero | Marques + nb produits (**depuis Supabase**) |
| Services | `#services` | 6 cartes B2B (vente, commande, facturation, livraison, chat, multi-marques) |
| Catalogue | `#produits` | Blocs par marque + cartes produits |
| À propos / Contact | `#apropos`, `#contact` | Présentation HB Commerce |

### Règle mise en page hero

Contenu hero **aligné en haut** sous la navigation — **pas centré verticalement** au milieu de l'écran.

### Détection automatique des marques

1. Slug/nom contient `fiafi` → **FIAFI**
2. Slug/nom contient `tounsi` → **TOUNSI**
3. Préfixe avant `—`, `-` ou `|` → nom de marque (ex. `Cap Bon — …` → **CAP BON**)
4. Sinon → **Autres produits**

Nouvelle marque en admin = nouveau bloc automatique à l'accueil.

### Navigation publique (`index.html`)

| Élément | Règle |
|---------|-------|
| Liens principaux | Accueil, Catalogue, Services, Confiance |
| Menu **Plus** (déroulant) | Paiement & Facturation, FAQ, Contact, Brochure |
| Compte / Connexion | Zone droite (`site-nav-actions`) — texte non tronqué |
| Langues | **FR · DE · EN** (`js/locale-de.js`, `js/locale-en.js`, `js/locales.js`) |
| Pays / marché | **Plus de sélecteur LU/FR** dans la barre ; marché fixe France (`js/markets.js`) |

---

## 7. Catalogue produits (Supabase uniquement)

### Règle demandée : pas de catalogue JavaScript de secours

Le site public lit **uniquement** la table `products` (et tables liées).  
Fichier supprimé : `js/hb-demo-catalog.js`.

| Action admin / base | Effet site |
|---------------------|------------|
| Produit actif | Visible |
| `active = false` | Masqué |
| Suppression | Disparaît |
| Modification champs | Mis à jour au rechargement |
| Stock | `product_stocks` → dispo. En stock / Sur commande |
| Prix client | `customer_prices` si session client |

**Enrichissement FIAFI autorisé :** `js/fiafi-catalog.js` complète image/acidité/format pour produits FIAFI **déjà présents en base** — sans réinjecter de produits absents.

### Prérequis affichage

1. Migrations Supabase (voir §18)
2. **`supabase/seed-demo-data.sql`** obligatoire pour la demo multi-marques
3. `index.html` doit charger **`@supabase/supabase-js`** avant `config.js`

### Messages si catalogue vide

- Base vide → inviter à exécuter `seed-demo-data.sql`
- Erreur Supabase → message d'erreur explicite (pas de fallback silencieux)

---

## 8. Fiches produit (site public)

Sous chaque image (`index.html`, `produits.html`) :

| Élément | Règle |
|---------|-------|
| **Acidité** | Huiles uniquement (`acidity` ou détection huile/olive) |
| **Pays** | Champ `origin` |
| **Dispo.** | Vert = en stock (`product_stocks`), orange = sur commande |
| **Fiche technique** | Bouton → modale `#productTechModal` |

**Contenu modale :** produit, format, catégorie, conditionnement, volume, acidité, origine, specs FIAFI (pression, peroxyde, humidité), quantité min., délai, description.

---

## 9. Prix, panier et paiement

| Règle | Détail |
|-------|--------|
| Prix catalogue | Masqués avant connexion (`canViewPrices`) |
| Prix personnalisés | Par société + slug produit (`customer_prices`) |
| Panier | LocalStorage + sync Supabase au checkout |
| Paiement | `virement`, `cheque`, `stripe` (optionnel) |

---

## 10. Agents commerciaux

### Espace dédié `agent.html`

- Voient **uniquement** les clients avec `commercial_agent_id` = leur profil
- **Créer un client** (onglet Clients → Créer) — assignation automatique à l'agent
- **Créer une commande** pour un client (onglet Commandes → Créer une commande) :
  - Lignes produits, prix client négocié si `customer_prices`, adresse, paiement, date livraison estimée
  - Statut initial : **Validée** (virement/chèque) ou **En attente paiement** (Stripe)
  - Commande visible **côté client** (`compte.html`) **et agent** (`agent.html`)
- **Logistique livraison** : bouton **Suivi / livreur** sur chaque commande
  - Date livraison estimée, statut livraison, transporteur, n° suivi, notes
  - **Assignation livreur** (liste `delivery_drivers`)
  - Modification **statut commande** (validée, en préparation, expédiée, …)
- Modération chat des sociétés assignées
- Tarifs personnalisés pour le portefeuille
- Stock : **consultation seule** + alertes (pas d'achat RH ni clôture alerte)
- **Pas d'accès** aux onglets admin RH (fournisseurs, stock global, analyses, construction, Équipe HB)

### Admin RH vs agent

| Besoin | Où |
|--------|-----|
| Créer un **agent** ou **livreur** (compte) | Super root **ou** `admin.html` → Équipe HB |
| Activité commerciale (clients, commandes) | **`agent.html`** |
| Stock, fournisseurs, analyses | **`admin.html`** |

**Migration Supabase requise (agent commandes + livreurs) :**

- **`supabase/migration-livreurs-setup-complete.sql`** (recommandé, tout-en-un)
- ou dans l'ordre : `migration-delivery-drivers.sql` → `migration-agent-driver-assignment.sql` → `migration-agent-order-create.sql`
- + `migration-agent-commercial-capabilities.sql` (création client par agent)

**Comptes demo :**

- `agent.martin@hbcommerce.demo` → **`agent.html`** — Le Jasmin, Traiteur Lyon
- `agent.dubois@hbcommerce.demo` → **`agent.html`** — Epicerie Bordeaux, Hotel Nice

---

## 11. Fournisseurs, stock et achats

| Fonction | Détail |
|----------|--------|
| Entités fournisseurs | Table `suppliers`, liées aux produits |
| Comptes `supplier` | Espace `supplier.html` |
| Stock | `product_stocks` (quantité, réservé, délai) |
| Commandes appro. | `supplier_orders` admin → fournisseur |
| Incidents stock | Migration `migration-stock-incidents.sql` |

**Demo :** 3 fournisseurs (FIAFI Tunisie, TOUNSI Agro, Tunisie Gourmet).

---

## 12. Commandes, factures et livraison

### Statuts commande (`orders.status`)

`en_attente`, `validee`, `en_attente_paiement`, `payee`, `en_preparation`, `expediee`, `livree`, `annulee`

### Statuts livraison (`orders.delivery_status`)

`non_preparee`, `preparation`, `prete`, `expediee`, `en_transit`, `livree`, `incident`, `retour`

### Règle admin / agent : suivi en modale

Suivi livraison (statut, transporteur, n° suivi, URL, dates, notes, **livreur assigné**) dans **`#trackingModal`** — **plus de formulaire inline** dans le tableau.

Disponible dans **`admin.html`** (toutes commandes) et **`agent.html`** (commandes du portefeuille).

### Commande créée par l'agent

| Champ | Règle |
|-------|-------|
| `orders.user_id` | UUID du **client** (pas de l'agent) |
| Visibilité client | `fetchUserOrders(client_id)` dans `compte.html` |
| Visibilité agent | Filtre `commercial_agent_id` sur profils clients |
| Stock | Déduction via `admin-api-stock.js` si configuré |
| RLS | Policies `Commercial agent insert assigned client orders` + `order_items` |

### Côté client

- Suivi commandes et livraison dans `compte.html`
- Factures téléchargeables

---

## 13. Chat et modération

### Admin — liste par société

- Colonne gauche : `#adminChatList` (sociétés clientes)
- Colonne droite : fil messages
- Badge messages **en attente** par société

### Statuts messages (`chat_messages.status`)

| Statut | Règle |
|--------|-------|
| `pending` (client) | Boutons **Valider** / **Refuser** visibles |
| `approved` | Visible côté client |
| `rejected` | Masqué côté client |

Réponses **admin / agent / super_root** : publiées directement (pas de modération sortante).

**Migration :** `supabase/migration-chat-moderation-policies.sql`

---

## 14. Suivi construction du site (admin)

Onglet **Construction** (admin uniquement) :

- Barre de progression (% terminé / en cours / à faire)
- **Rapport tests E2E Selenium** (taux de réussite, suites, scénarios) — source `tests/reports/latest.json`
- Tableau tâches par catégorie : Site public, Admin, Auth, Stock, Pages légales, Technique, Général
- Statuts : `done`, `in_progress`, `todo`
- Actions : Ajouter, Modifier, Marquer terminé, Supprimer

**Fichiers :** `js/admin-roadmap.js`, `js/admin-qa-report.js`, panneau `#panel-construction`  
**Tests :** `docs/TESTS-E2E-SCENARIOS.md`, `python tests/run_tests.py`  
**Migration Supabase :** `supabase/migration-site-roadmap.sql` (sinon mode local `localStorage`)

---

## 15. Analyses financières (admin)

Onglet **Analyses** (admin uniquement) — tableaux et indicateurs financiers (dépenses, marges).  
Migration associée : `supabase/migration-business-expenses.sql`

---

## 16. Environnement de démonstration

| Paramètre | Valeur |
|-----------|--------|
| **URL** | https://hbconsultingsrv-arch.github.io/hb-commerce/ |
| **Mot de passe** | `Test1234!` (tous comptes) |
| **Script SQL** | `supabase/seed-demo-data.sql` |
| **Hub demo** | `docs/exemples/index.html` |

### Catalogue demo (14 produits actifs)

| Marque | Produits |
|--------|----------|
| FIAFI | 6 huiles (Premium, Marasca, 1L, métallique 1L/3L/5L) |
| TOUNSI | 3 huiles (1L, métallique 3L/5L) |
| Cap Bon | Harissa 380 g |
| Oasis | Dattes 1 kg |
| Moncef | Couscous 5 kg |
| Les Moulins | Huile tournesol 5 L |
| Moulin | Confiture figue 370 g |

### Données demo incluses

- Stock par produit, commandes appro., prix clients
- 6 commandes clients (statuts + livraison variés)
- Messages chat (approved, pending, rejected)

### Comptes demo

| E-mail | Rôle | Page |
|--------|------|------|
| `super@hbcommerce.demo` | super_root | `super-root.html` |
| `admin@hbcommerce.demo` | admin | `admin.html` |
| `agent.martin@hbcommerce.demo` | agent | **`agent.html`** |
| `agent.dubois@hbcommerce.demo` | agent | **`agent.html`** |
| `contact@restaurant-paris.demo` | client | `compte.html` |
| `achats@traiteur-lyon.demo` | client | `compte.html` |
| `commandes@epicerie-bdx.demo` | client | `compte.html` |
| `direction@hotel-nice.demo` | client | `compte.html` |
| `inscription@nouvelle-societe.demo` | pending | `compte.html` |
| `stock@fiafi-tunisie.demo` | supplier | `supplier.html` |
| `livreur@hbcommerce.demo` | livreur | `livreur.html` (3 courses assignées) |

**Images demo :** URLs Unsplash dans le seed (pas Google Drive pour nouveaux produits).

---

## 17. Pages du site et hub demo

| Page | Fichier | Usage |
|------|---------|-------|
| Accueil | `index.html` | HB Commerce multi-marques |
| Catalogue | `produits.html` | Produits B2B |
| Panier | `panier.html` | Panier pro |
| Checkout | `checkout.html` | Paiement |
| Connexion | `login.html` | Auth |
| Inscription | `register.html` | Création société |
| Espace client | `compte.html` | Commandes, chat, factures |
| **Espace agent** | **`agent.html`** | Portefeuille commercial externe |
| Admin (RH) | `admin.html` | Back-office global |
| Super root | `super-root.html` | Comptes HB (+ livreur) |
| Fournisseur | `supplier.html` | Stock |
| Livreur | `livreur.html`, `login-livreur.html` | Courses assignées |
| Brochure FR | `brochure-france.html` | Marché France |
| Brochure LU | `brochure-luxembourg.html` | Marché Luxembourg |
| Hub demo | `docs/exemples/index.html` | Index comptes + liens |
| Présentation | `docs/presentation/index.html` | Slides web |

---

## 18. Architecture, migrations et déploiement

### Stack

- **Frontend :** HTML, CSS, JavaScript — **GitHub Pages** (branche `main`, racine)
- **Backend :** Supabase (Auth, PostgreSQL, RLS, Storage images)
- **Config :** `js/config.js`

### Ordre migrations Supabase recommandé

1. `schema.sql`
2. `migration-access-chat-pricing.sql`
3. `migration-company-client-fields.sql`
4. `migration-commercial-agents.sql`
5. `migration-order-delivery-tracking.sql`
6. `migration-suppliers.sql`
7. `migration-fiafi-catalog.sql`
8. `migration-chat-moderation-policies.sql`
9. `migration-site-roadmap.sql`
10. `migration-business-expenses.sql`
11. `migration-stock-management.sql` (+ patches/incidents si besoin)
12. `migration-admin-enhancements.sql`
13. `migration-product-images-storage.sql`
14. **`migration-livreurs-setup-complete.sql`** ← livreurs + agent commandes + assignation (**recommandé**)
    - *Alternative en 3 fichiers (ordre strict) :* `migration-delivery-drivers.sql` → `migration-agent-driver-assignment.sql` → `migration-agent-order-create.sql`
15. `migration-agent-commercial-capabilities.sql` (agent crée client assigné)
16. `migration-profile-livreur-admin.sql` (si rôle livreur absent du CHECK)
17. **`seed-demo-data.sql`**

> **Erreur fréquente :** exécuter `migration-agent-driver-assignment.sql` **sans** avoir créé la table `delivery_drivers` → utiliser le script **§14 complet** ci-dessus.

### Module QA / tests E2E (Selenium Python)

Tests automatisés Selenium + pytest, scénarios documentés dans **`docs/TESTS-E2E-SCENARIOS.md`**.  
Rapport affiché sous **Admin → Construction**. CI : `.github/workflows/e2e-tests.yml`.

*(Ancien module Playwright sur branche `feature/module-qa` — remplacé par cette implémentation.)*

---

## 19. Documentation et présentation

| Livrable | Fichier |
|----------|---------|
| **Document maître (ce fichier)** | `docs/FONCTIONNALITES-ET-REGLES-DEMANDEES.md` |
| Index docs | `docs/README.md` |
| Cahier des charges (résumé / redirect) | `docs/CAHIER-DES-CHARGES.md` |
| Word | `docs/cahier-des-charges-hb-commerce.docx` |
| PowerPoint | `docs/presentation-hb-commerce.pptx` |

**Régénération Office :**

```bash
pip install python-pptx
python scripts/generate-docs.py
python scripts/patch-docs-demo.py
```

---

## 20. Règles techniques impératives

| Sujet | Règle |
|-------|-------|
| Catalogue public | Source = Supabase uniquement |
| Supabase sur accueil | CDN `@supabase/supabase-js` requis |
| Cache navigateur | `?v=…` sur CSS/JS après déploiement |
| Onglets admin | `.admin-panel[hidden] { display: none !important; }` |
| Prix | Masqués sans connexion client |
| Collaborateur GitHub | Invitation manuelle si `gh` CLI absent |
| Demo SQL | Ré-exécutable (nettoyage UUID fixes) |
| i18n | Clés `data-i18n` ; fichiers `locales.js`, `locale-de.js`, `locale-en.js` |
| Nav accueil | Menu **Plus** ; pas de défilement horizontal qui tronque les liens |
| Agent commande | `user_id` = client ; policies INSERT agent sur `orders` / `order_items` |

---

## 21. Interdictions / à ne pas refaire

1. Catalogue JS de secours (`hb-demo-catalog.js`)
2. Réinjection auto produits FIAFI/demo absents de Supabase
3. Formulaire inline suivi livraison (utiliser modale)
4. Onglet « Modifier » dédié super root
5. Script `generate-docs.ps1` (Word/PPT corrompus)
6. Hero accueil centré verticalement au milieu
7. Boutons Valider/Refuser sur messages non-`pending`
8. Super root sur opérations catalogue/commandes
9. Agent commercial pur sur `admin.html` (utiliser `agent.html`)
10. Exécuter `migration-agent-driver-assignment.sql` sans table `delivery_drivers`

---

## 22. Fichiers clés

| Domaine | Fichiers |
|---------|----------|
| Accueil | `index.html`, `js/main.js`, `js/hb-front.js`, `css/hero-premium.css` |
| i18n | `js/locales.js`, `js/locale-de.js`, `js/locale-en.js`, `js/market-ui.js` |
| Catalogue | `js/products.js`, `js/fiafi-catalog.js`, `js/supabase-client.js` |
| Fiche technique | `#productTechModal`, `js/products.js` |
| Admin RH | `admin.html`, `js/admin.js`, `js/admin-roadmap.js` |
| **Agent commercial** | **`agent.html`**, `js/agent-page.js`, `window.HB_COMMERCIAL_SPACE` |
| Super root | `super-root.html`, `js/super-root.js`, `js/driver-api.js` |
| Livreur | `livreur.html`, `js/livreur.js`, `js/driver-api.js` |
| Fournisseur | `supplier.html`, `js/supplier.js` |
| Auth / routing | `js/auth.js` (`getDefaultDashboardUrl`, `updateNavAuth`) |
| Chat | `js/admin.js`, `migration-chat-moderation-policies.sql` |
| Migrations livreurs | `supabase/migration-livreurs-setup-complete.sql` |
| Demo SQL | `supabase/seed-demo-data.sql` |
| Styles onglets | `css/style.css`, `css/admin-shell.css` |

---

*Document maître v1.8 — HB Commerce / HB Groupe — 30/06/2026*
