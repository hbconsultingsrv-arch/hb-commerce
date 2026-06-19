# Cahier des charges — HB Commerce v1.2

**Créateur :** HB Consulting & Services / HB Commerce  
**Dernière modification :** 19/06/2026  
**Site demo :** https://hbconsultingsrv-arch.github.io/hb-commerce/

## Tableau d'évolution

| Version | Date | Auteur | Modification | Statut |
|---------|------|--------|--------------|--------|
| 1.0 | 18/06/2026 | HB Commerce | Création initiale | Validé |
| 1.1 | 18/06/2026 | HB Commerce | Fournisseurs, stock, agents, factures | Validé |
| 1.2 | 19/06/2026 | HB Commerce | Index demo, pages d'exemple, modération chat | Validé |

## Sommaire

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Périmètre fonctionnel](#2-périmètre-fonctionnel)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Parcours client B2B](#4-parcours-client-b2b)
5. [Dashboard admin](#5-dashboard-admin)
6. [Dashboard super root](#6-dashboard-super-root)
7. [Agents commerciaux](#7-agents-commerciaux)
8. [Fournisseurs et stock](#8-fournisseurs-et-stock)
9. [Commandes, factures et livraison](#9-commandes-factures-et-livraison)
10. [Chat et modération](#10-chat-et-modération)
11. [Prix personnalisés](#11-prix-personnalisés)
12. [Environnement de démonstration](#12-environnement-de-démonstration)
13. [Pages d'exemple (présentation)](#13-pages-dexemple-présentation)
14. [Architecture technique](#14-architecture-technique)
15. [Migrations Supabase](#15-migrations-supabase)
16. [Déploiement GitHub Pages](#16-déploiement-github-pages)

---

## 1. Contexte et objectifs

HB Commerce est une plateforme B2B de vente en gros de produits alimentaires (premier produit : huile FIAFI, origine Tunisie). L'objectif est de digitaliser le parcours professionnel : catalogue, commande, suivi, relation commerciale et modération des échanges.

## 2. Périmètre fonctionnel

- Site vitrine multi-marchés (France, Luxembourg)
- Catalogue produits avec prix masqués avant connexion
- Panier, checkout, paiement (virement, chèque, Stripe)
- Espace client : profil, commandes, factures, chat
- Back-office admin : produits, fournisseurs, sociétés, commandes, prix, chat
- Super root : gestion des comptes internes HB Commerce
- Espace fournisseur : stock et commandes d'approvisionnement

## 3. Rôles et permissions

| Rôle | Accès principal |
|------|-----------------|
| `super_root` | Utilisateurs internes, promotion admin |
| `admin` | Opérations catalogue, sociétés, commandes, chat |
| `agent_commercial` | Clients assignés, chat, commandes limitées |
| `client` | Catalogue, commandes, chat société |
| `supplier` | Stock fournisseur, commandes reçues |
| `pending_company` | Compte en attente de validation |

## 4. Parcours client B2B

1. Inscription société (`register.html`)
2. Connexion (`login.html`)
3. Consultation catalogue (`produits.html`)
4. Panier et checkout
5. Suivi commandes et chat (`compte.html`)

## 5. Dashboard admin

Onglets : Produits, Fournisseurs, Commandes, Sociétés, Prix clients, Chat & modération.

- Suivi livraison via fenêtre modale
- Modération chat : Valider / Refuser messages clients en attente
- Création sociétés clients/fournisseurs

## 6. Dashboard super root

Gestion exclusive des comptes internes : super root, admin, agents commerciaux.

- Onglets : Équipe, Nouveau
- Modification via bouton en fin de ligne (fenêtre modale)
- Bouton Aide contextuel

## 7. Agents commerciaux

Chaque agent voit uniquement les sociétés clients qui lui sont assignées. Il peut modérer le chat et gérer les commandes de ses clients.

## 8. Fournisseurs et stock

- Entités fournisseurs liées aux produits
- Comptes `supplier` avec espace dédié
- Commandes d'approvisionnement admin → fournisseur

## 9. Commandes, factures et livraison

Statuts commande, suivi livraison (transporteur, n° suivi, dates), factures téléchargeables côté client.

## 10. Chat et modération

Messages clients soumis à validation (`pending` → `approved` / `rejected`). Réponses admin/agents publiées directement.

## 11. Prix personnalisés

Prix client par produit configurable depuis l'admin.

---

## 12. Environnement de démonstration

| Paramètre | Valeur |
|-----------|--------|
| **Site** | https://hbconsultingsrv-arch.github.io/hb-commerce/ |
| **Mot de passe** | `Test1234!` (tous les comptes) |
| **Script SQL** | `supabase/seed-demo-data.sql` |
| **Hub demo** | `docs/exemples/index.html` |

### Comptes demo

| E-mail | Rôle | Page | Description |
|--------|------|------|-------------|
| `super@hbcommerce.demo` | Super root | `super-root.html` | Utilisateurs internes |
| `admin@hbcommerce.demo` | Admin | `admin.html` | Dashboard opérationnel |
| `agent.martin@hbcommerce.demo` | Agent | `admin.html` | Clients Le Jasmin, Traiteur Lyon |
| `agent.dubois@hbcommerce.demo` | Agent | `admin.html` | Clients Bordeaux, Hotel Nice |
| `contact@restaurant-paris.demo` | Client | `compte.html` | Restaurant Le Jasmin |
| `achats@traiteur-lyon.demo` | Client | `compte.html` | Traiteur Lyon Gourmet |
| `commandes@epicerie-bdx.demo` | Client | `compte.html` | Epicerie Bordeaux Sud |
| `direction@hotel-nice.demo` | Client | `compte.html` | Hotel Riviera Nice |
| `inscription@nouvelle-societe.demo` | En attente | `compte.html` | Société pending |
| `stock@fiafi-tunisie.demo` | Fournisseur | `supplier.html` | FIAFI Tunisie |

### Données demo incluses

- Catalogue FIAFI complet
- Commandes clients avec statuts variés
- Messages chat (validés, en attente, refusés)
- Fournisseur FIAFI Tunisie avec stock

---

## 13. Pages d'exemple (présentation)

| Page | URL relative | Description |
|------|--------------|-------------|
| Accueil | `index.html` | Vitrine FIAFI |
| Catalogue | `produits.html` | Produits B2B |
| Panier | `panier.html` | Panier |
| Checkout | `checkout.html` | Paiement |
| Connexion | `login.html` | Auth |
| Inscription | `register.html` | Création société |
| Espace client | `compte.html` | Commandes, profil, chat |
| Admin | `admin.html` | Back-office |
| Super root | `super-root.html` | Utilisateurs internes |
| Fournisseur | `supplier.html` | Stock |
| Brochure FR | `brochure-france.html` | Marché France |
| Brochure LU | `brochure-luxembourg.html` | Marché Luxembourg |
| Hub demo | `docs/exemples/index.html` | Index interactif |
| Présentation web | `docs/presentation/index.html` | Slides projet |

---

## 14. Architecture technique

- **Frontend :** HTML, CSS, JavaScript — GitHub Pages
- **Backend :** Supabase (Auth, PostgreSQL, RLS)
- **Paiement :** virement, chèque, Stripe (optionnel)
- **Config :** `js/config.js` (clés Supabase)

## 15. Migrations Supabase

1. `schema.sql`
2. `migration-access-chat-pricing.sql`
3. `migration-company-client-fields.sql`
4. `migration-commercial-agents.sql`
5. `migration-order-delivery-tracking.sql`
6. `migration-suppliers.sql`
7. `migration-chat-moderation-policies.sql`
8. `seed-demo-data.sql`

## 16. Déploiement GitHub Pages

Branche `main`, dossier racine. URL : `https://hbconsultingsrv-arch.github.io/hb-commerce/`

---

*Document généré pour HB Commerce — HB Consulting & Services*
