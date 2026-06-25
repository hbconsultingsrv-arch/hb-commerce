# Fonctionnalités et règles demandées — HB Commerce

**Projet :** HB Commerce — HB Consulting & Services  
**Dernière mise à jour :** 19/06/2026  
**Site :** https://hbconsultingsrv-arch.github.io/hb-commerce/

Ce document recense **toutes les fonctionnalités et règles explicitement demandées** lors du développement. Il complète le [cahier des charges](CAHIER-DES-CHARGES.md) (vision produit) avec le détail des choix validés en conversation.

---

## Sommaire

1. [Organisation des rôles et dashboards](#1-organisation-des-rôles-et-dashboards)
2. [Page d'accueil HB Commerce](#2-page-daccueil-hb-commerce)
3. [Catalogue produits (source de vérité)](#3-catalogue-produits-source-de-vérité)
4. [Fiches produit sur le site public](#4-fiches-produit-sur-le-site-public)
5. [Chat admin et modération](#5-chat-admin-et-modération)
6. [Commandes et suivi livraison (admin)](#6-commandes-et-suivi-livraison-admin)
7. [Dashboard super root](#7-dashboard-super-root)
8. [Environnement de démonstration (Supabase)](#8-environnement-de-démonstration-supabase)
9. [Documentation et présentation](#9-documentation-et-présentation)
10. [Règles techniques impératives](#10-règles-techniques-impératives)
11. [Interdictions / à ne pas refaire](#11-interdictions--à-ne-pas-refaire)

---

## 1. Organisation des rôles et dashboards

### Règle : séparation super root / admin

| Espace | Rôle cible | Périmètre |
|--------|------------|-----------|
| `super-root.html` | `super_root` | **Uniquement** les utilisateurs internes HB Commerce |
| `admin.html` | `admin`, `agent_commercial` | **Opérations** : catalogue, sociétés, commandes, chat, stock |

Le super root **ne gère pas** le catalogue ni les commandes clients au quotidien. L'admin **ne gère pas** la promotion des comptes internes (super root, admin, agents).

### Onglets admin (`admin.html`)

Navigation latérale + onglets horizontaux par section :

- Tableau de bord, Produits, Fournisseurs, Stock & achats, Commandes, Clients, Prix clients, Analyses, Construction, Support (chat)

**Règle CSS :** les panneaux masqués doivent rester invisibles :

```css
.admin-panel[hidden] { display: none !important; }
```

Sans cette règle, `display: flex` sur `.admin-panel` écrase l'attribut HTML `hidden`.

### Visibilité selon le rôle

- Éléments `.admin-only` : réservés au rôle `admin` (pas aux agents commerciaux)
- Les agents voient leurs clients assignés et le chat/modération sur leur périmètre

---

## 2. Page d'accueil HB Commerce

### Refonte demandée

L'accueil (`index.html`) doit présenter **HB Commerce** comme plateforme B2B multi-marques, et non plus uniquement FIAFI.

**Sections obligatoires :**

| Section | ID | Contenu |
|---------|-----|---------|
| Hero | `#accueil` | Titre HB Commerce, texte multi-marques (FIAFI, TOUNSI, …), pills marques dynamiques, CTA catalogue / compte pro |
| Catalogue actif | panneau hero droit | Liste des marques + nombre de produits (depuis la base) |
| Services | `#services` | 6 cartes : vente B2B, commande en ligne, facturation, livraison, chat commercial, multi-marques |
| Catalogue par marque | `#produits` | Blocs par marque avec grille produits |
| À propos / Contact | `#apropos`, `#contact` | Inchangés fonctionnellement |

### Règle de mise en page hero

Le contenu hero (titre, texte, pills, boutons) doit être **aligné en haut**, sous la barre de navigation — **pas centré verticalement** au milieu de l'écran.

### Détection automatique des marques

Un produit est rattaché à une marque selon :

1. Nom ou slug contenant `fiafi` → **FIAFI**
2. Nom ou slug contenant `tounsi` → **TOUNSI**
3. Sinon : préfixe avant `—`, `-` ou `|` dans le nom (ex. `Cap Bon — …` → **CAP BON**)
4. Sinon : **Autres produits**

Toute nouvelle marque ajoutée en admin avec un nom préfixé apparaît automatiquement dans un bloc dédié.

---

## 3. Catalogue produits (source de vérité)

### Règle principale : base de données uniquement

**Demande explicite :** ne pas utiliser de catalogue de secours JavaScript pour l'affichage public.

| Action | Effet sur le site |
|--------|-------------------|
| Produit **actif** en base | Visible |
| Produit **désactivé** (`active = false`) | Masqué |
| Produit **supprimé** en base | Disparaît |
| Produit **modifié** en admin | Mis à jour au rechargement |
| Stock | Lu depuis `product_stocks` |
| Prix client | Lu depuis `customer_prices` (si connecté) |

**Fichiers concernés :** `js/products.js`, `js/fiafi-catalog.js` (enrichissement FIAFI uniquement, pas d'injection de produits).

### Prérequis Supabase

1. `supabase/schema.sql` (+ migrations listées dans le cahier des charges)
2. **`supabase/seed-demo-data.sql`** — obligatoire pour la demo multi-marques

Sans seed, le site peut afficher un message explicite invitant à exécuter le script SQL.

### Bibliothèque Supabase sur l'accueil

`index.html` doit charger `@supabase/supabase-js` **avant** `config.js` et `supabase-client.js`, sinon le catalogue reste vide.

---

## 4. Fiches produit sur le site public

### Bande d'informations sous l'image

Sous chaque photo produit (accueil et `produits.html`), afficher :

| Info | Règle |
|------|-------|
| **Acidité** | Affichée pour les huiles (champ `acidity` ou détection huile/olive dans le nom) |
| **Pays** | Champ `origin` (ex. Tunisie) |
| **Dispo.** | **En stock** (vert) si stock > 0, **Sur commande** (orange) sinon |
| **Fiche technique** | Bouton ouvrant une **modale** avec le détail technique |

### Contenu de la fiche technique (modale)

- Produit, format, catégorie, conditionnement, volume
- Acidité, pays/origine
- Pour huiles FIAFI : pression à froid, indice de peroxyde, humidité
- Quantité minimum, disponibilité, délai de livraison, description

**Fichiers :** `js/products.js` (`renderProductInfoStrip`, `openProductTechSheet`), modale `#productTechModal` dans `index.html` et `produits.html`.

---

## 5. Chat admin et modération

### Liste par société

Dans `admin.html` → onglet **Support / Chat** :

- Liste des **sociétés clientes** à gauche (`#adminChatList`)
- Fil de messages de la société sélectionnée à droite
- Badge nombre de messages **en attente** par société

### Modération

| Statut message | Comportement |
|----------------|--------------|
| `pending` (client) | Boutons **Valider** / **Refuser** visibles |
| `approved` | Message visible côté client |
| `rejected` | Message masqué côté client |

Les réponses **admin / agent / super_root** sont publiées directement (pas de modération sortante).

**Migration requise :** `supabase/migration-chat-moderation-policies.sql`

---

## 6. Commandes et suivi livraison (admin)

### Règle : suivi en modale

Le suivi livraison (statut, transporteur, n° suivi, URL, dates, notes) s'ouvre dans une **fenêtre modale** (`#trackingModal`), **plus de formulaire inline** dans le tableau des commandes.

---

## 7. Dashboard super root

### Onglets

- **Équipe** : liste des comptes internes (super root, admin, agents)
- **Nouveau** : création d'un compte interne

**Supprimé :** onglet « Modifier » dédié — la modification se fait via un **bouton en fin de ligne** ouvrant une **modale d'édition**.

### Aide contextuelle

Bouton **Aide** ouvrant une modale explicative (`#superRootInfoModal`).

### Périmètre strict

Le super root gère **uniquement** les rôles internes : `super_root`, `admin`, `agent_commercial`.

---

## 8. Environnement de démonstration (Supabase)

### Mot de passe universel

**`Test1234!`** pour tous les comptes demo.

### Script principal

`supabase/seed-demo-data.sql` — ré-exécutable (nettoyage des données demo avant réinsertion).

### Catalogue demo (14 produits actifs)

| Marque | Produits |
|--------|----------|
| **FIAFI** | 6 huiles (Premium, Marasca, bouteille 1L, métallique 1L/3L/5L) |
| **TOUNSI** | 3 huiles (extra vierge 1L, métallique 3L/5L) |
| **Cap Bon** | Harissa forte 380 g |
| **Oasis** | Dattes Deglet Nour 1 kg |
| **Moncef** | Couscous moyen 5 kg |
| **Les Moulins** | Huile tournesol 5 L |
| **Moulin** | Confiture figue 370 g |

### Fournisseurs demo

- FIAFI Tunisie — Mornag
- TOUNSI Agro — Sfax
- Tunisie Gourmet Distribution — épicerie / produits secs

### Données associées

- Stock fournisseur par produit (`product_stocks`)
- Commandes d'approvisionnement (`supplier_orders`)
- Prix personnalisés clients (`customer_prices`)
- 6 commandes clients (statuts variés + suivi livraison)
- Messages chat (validés, pending, refusés) par société

### Comptes demo

| E-mail | Rôle |
|--------|------|
| `super@hbcommerce.demo` | super_root |
| `admin@hbcommerce.demo` | admin |
| `agent.martin@hbcommerce.demo` | agent_commercial |
| `agent.dubois@hbcommerce.demo` | agent_commercial |
| `contact@restaurant-paris.demo` | client |
| `achats@traiteur-lyon.demo` | client |
| `commandes@epicerie-bdx.demo` | client |
| `direction@hotel-nice.demo` | client |
| `inscription@nouvelle-societe.demo` | pending_company |
| `stock@fiafi-tunisie.demo` | supplier |

### Images produits demo

URLs **Unsplash** (gratuites) dans le seed — pas de Google Drive pour les nouveaux produits.

---

## 9. Documentation et présentation

### Livrables documentaires demandés

- Cahier des charges : `docs/CAHIER-DES-CHARGES.md` (+ exports Word/PPT)
- Hub demo : `docs/exemples/index.html`
- Présentation web : `docs/presentation/index.html`
- Régénération Office : **`scripts/generate-docs.py`** et **`scripts/patch-docs-demo.py`**

### Règle : ne pas utiliser

**`scripts/generate-docs.ps1`** — supprimé car il produisait des fichiers `.docx` / `.pptx` corrompus.

---

## 10. Règles techniques impératives

| Sujet | Règle |
|-------|-------|
| Frontend public | GitHub Pages, branche `main`, dossier racine |
| Backend | Supabase (Auth + PostgreSQL + RLS) |
| Config | `js/config.js` (clés Supabase — ne pas committer de secrets réels en public si projet privé) |
| Cache navigateur | Paramètre `?v=…` sur CSS/JS après chaque déploiement important |
| Prix catalogue | Masqués avant connexion client (`canViewPrices`) |
| Panier | Persistant local + sync commandes Supabase au checkout |
| Enrichissement FIAFI | Images locales / catalogue FIAFI pour produits **déjà en base** avec slug FIAFI — sans ajouter de produits absents de la base |
| Collaborateur GitHub | Invitation manuelle via Settings → Collaborators (si `gh` CLI indisponible) |

---

## 11. Interdictions / à ne pas refaire

1. **Catalogue JavaScript de secours** pour remplacer la base (`hb-demo-catalog.js` supprimé)
2. **Réinjection automatique** des 6 FIAFI ou produits demo si absents de Supabase
3. **Formulaire inline** de suivi livraison dans le tableau commandes admin
4. **Onglet Modifier** dédié sur super root (utiliser modale)
5. **Script PowerShell** `generate-docs.ps1` pour Word/PPT
6. **Centrage vertical** du hero accueil au milieu de l'écran
7. **Modération** : boutons Valider/Refuser sur messages déjà approuvés ou refusés

---

## Fichiers clés par fonctionnalité

| Fonctionnalité | Fichiers |
|----------------|----------|
| Accueil multi-marques | `index.html`, `js/main.js`, `css/commerce.css` |
| Catalogue DB | `js/products.js`, `js/fiafi-catalog.js`, `js/supabase-client.js` |
| Fiche technique | `js/products.js`, modale dans `index.html` / `produits.html` |
| Admin opérations | `admin.html`, `js/admin.js` |
| Super root | `super-root.html`, `js/super-root.js` |
| Chat modération | `js/admin.js`, `supabase/migration-chat-moderation-policies.sql` |
| Demo SQL | `supabase/seed-demo-data.sql` |
| Styles onglets admin | `css/style.css` (`.admin-panel[hidden]`) |

---

*Document de référence des demandes utilisateur — HB Commerce / HB Consulting & Services*
