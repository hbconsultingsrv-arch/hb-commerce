# Tests E2E — scénarios et flux HB Commerce

**Outil principal :** Selenium + Python + pytest  
**Rapport :** `tests/reports/latest.json` — affiché dans **Admin → Construction**  
**CI :** GitHub Actions `.github/workflows/e2e-tests.yml` (push / PR sur `main`, ou **Run workflow** manuel)

---

## 1. Objectif

Avant la mise en ligne, valider automatiquement les **parcours métier complets** :

- Fournisseurs → stock → clients → commandes → livraison  
- Routing par rôle (client, agent, admin, livreur, super root)  
- Pages publiques et navigation  

Chaque modification du site peut relancer la suite pour détecter les régressions.

---

## 2. Lancer les tests

### Prérequis

- Python 3.10+
- Google Chrome installé

```bash
pip install -r requirements-test.txt
```

### Contre le site demo (GitHub Pages)

```bash
set HB_TEST_BASE_URL=https://hbconsultingsrv-arch.github.io/hb-commerce/
set HB_TEST_PASSWORD=Test1234!
python tests/run_tests.py
```

### En local

```bash
python -m http.server 8080
set HB_TEST_BASE_URL=http://localhost:8080/
python tests/run_tests.py
```

### Scénarios d'intégration (modifient la base demo)

```bash
set HB_TEST_INTEGRATION=1
python tests/run_tests.py
```

> À n'utiliser que sur une base de **démonstration**, jamais en production réelle.

### Relancer la CI (sans machine locale)

1. GitHub → **Actions** → workflow **Tests E2E Selenium**
2. **Run workflow** → branche `main` → **Run workflow**
3. Consulter les logs ou l'artefact `e2e-report` ; le rapport est aussi publié sur `main` (bloc **Admin → Construction**)

---

## 3. Cartographie des flux logiques

| ID | Flux | Acteur | Étapes clés | Fichier test |
|----|------|--------|-------------|--------------|
| **FLUX-PUB-01** | Vitrine accueil | Visiteur | Charge index, nav visible | `test_01_public_smoke.py` |
| **FLUX-PUB-02** | Menu Plus | Visiteur | Ouvre dropdown Contact/FAQ/Brochure | `test_01_public_smoke.py` |
| **FLUX-PUB-03** | Catalogue | Visiteur | `produits.html` accessible | `test_01_public_smoke.py` |
| **FLUX-PUB-04** | Connexion UI | Visiteur | Formulaire login présent | `test_01_public_smoke.py` |
| **FLUX-AUTH-01** | Login admin | Admin | → `admin.html` | `test_02_auth_routing.py` |
| **FLUX-AUTH-02** | Login agent | Agent | → `agent.html` | `test_02_auth_routing.py` |

> Les tests auth nécessitent Supabase actif + comptes demo (`seed-demo-data.sql`). Si le projet Supabase est en pause, ils échouent avec un message explicite.
| **FLUX-AUTH-03** | Login client | Client | → `compte.html` | `test_02_auth_routing.py` |
| **FLUX-AUTH-04** | Login super root | Super root | → `super-root.html` | `test_02_auth_routing.py` |
| **FLUX-ADM-01** | Fournisseurs | Admin | Onglet fournisseurs accessible | `test_03_admin_navigation.py` |
| **FLUX-ADM-02** | Équipe HB | Admin | Agents + Livreurs | `test_03_admin_navigation.py` |
| **FLUX-ADM-03** | Construction + QA | Admin | Roadmap + rapport tests | `test_03_admin_navigation.py` |
| **FLUX-AGT-01** | Commandes agent | Agent | Liste commandes clients | `test_04_agent_space.py` |
| **FLUX-AGT-02** | Créer commande | Agent | Formulaire création commande | `test_04_agent_space.py` |
| **FLUX-AGT-03** | Soumission commande | Agent + client | Visible `compte.html` | `test_06_p0_core.py` |
| **FLUX-CLI-02** | Commandes client | Client | Table `compte.html` | `test_06_p0_core.py` |
| **FLUX-CHT-01** | Chat admin | Admin | Modération | `test_06_p0_core.py` |
| **FLUX-STK-03** | Alertes stock | Admin | `#stockAlertsPanel` | `test_06_p0_core.py` |
| **FLUX-AUTH-05** | Login fournisseur | Fournisseur | → `supplier.html` | `test_07_p1_roles.py` |
| **FLUX-AUTH-06** | Login livreur | Livreur | → `livreur.html` | `test_07_p1_roles.py` |
| **FLUX-SUP-01** | Espace fournisseur | Fournisseur | Stock + commandes | `test_07_p1_roles.py` |
| **FLUX-LIV-01** | Espace livreur | Livreur | KPI courses | `test_07_p1_roles.py` |
| **FLUX-SUP-02** | Super root équipe | Super root | `#profilesBody` | `test_07_p1_roles.py` |
| **FLUX-SUP-03** | Création livreur | Super root | Formulaire livreur | `test_07_p1_roles.py` |
| **FLUX-PUB-05** | Prix masqués | Visiteur | `xx` sans session | `test_08_p2_commerce.py` |
| **FLUX-PUB-06** | Prix visibles | Client | `€` connecté | `test_08_p2_commerce.py` |
| **FLUX-COM-01** | Inscription | Visiteur | `register.html` | `test_08_p2_commerce.py` |
| **FLUX-COM-02** | Panier → checkout | Client | localStorage + checkout | `test_08_p2_commerce.py` |
| **FLUX-STK-04** | Réception dépôt | Admin | Mouvement stock | `test_09_p3_stock_flow.py` 🔧 |
| **FLUX-STK-05** | Onglets alertes | Admin | En cours / Clos | `test_09_p3_stock_flow.py` 🔧 |
| **FLUX-STK-01** | Créer fournisseur | Admin | Formulaire fournisseur (intégration) | `test_05_supplier_stock_flow.py` |
| **FLUX-STK-02** | Fournisseur → stock → commande | Admin + client | Création fournisseur, accès stock (intégration) | `test_05_supplier_stock_flow.py` |
| **FLUX-ADM-04** | Tableau de bord | Admin | KPI `#adminDashboardHost` | `test_10_admin_extended.py` |
| **FLUX-ADM-05** | Produits CRUD | Admin | Catalogue + `#productForm` | `test_10_admin_extended.py` |
| **FLUX-ADM-06** | Suivi / livreur | Admin | `#trackingModal` | `test_10_admin_extended.py` |
| **FLUX-ADM-07** | Clients | Admin | Liste sociétés | `test_10_admin_extended.py` |
| **FLUX-ADM-08** | Prix clients | Admin | `#adminCustomerPriceForm` | `test_10_admin_extended.py` |
| **FLUX-ADM-09** | Analyses | Admin | `#analyticsKpis` | `test_10_admin_extended.py` |
| **FLUX-ADM-10** | Incidents stock | Admin | `#stockIncidentsBody` | `test_10_admin_extended.py` |
| **FLUX-ADM-11** | Validation société | Admin | `pending_company` → `client` | `test_10_admin_extended.py` |
| **FLUX-AGT-04** | Clients agent | Agent | Liste + créer client | `test_11_agent_extended.py` |
| **FLUX-AGT-05** | Prix agent | Agent | Portefeuille client | `test_11_agent_extended.py` |
| **FLUX-AGT-06** | Stock agent | Agent | `#commercialStockBody` | `test_11_agent_extended.py` |
| **FLUX-AGT-07** | Chat agent | Agent | `#adminChatReplyForm` | `test_11_agent_extended.py` |
| **FLUX-AGT-08** | Suivi agent | Agent | Modale livraison | `test_11_agent_extended.py` |
| **FLUX-AGT-09** | Alertes agent | Agent | Lecture seule | `test_11_agent_extended.py` |
| **FLUX-CLI-03** | Profil client | Client | `#profileForm` | `test_12_client_extended.py` |
| **FLUX-CLI-04** | Chat client | Client | `#companyChatForm` | `test_12_client_extended.py` |
| **FLUX-CLI-05** | Facture PDF | Client | `[data-invoice]` | `test_12_client_extended.py` |
| **FLUX-PUB-07** | Dispo stock carte | Visiteur | Badge stock catalogue | `test_13_public_products_i18n.py` |
| **FLUX-PUB-08** | Fiche technique | Visiteur | `#productTechModal` | `test_13_public_products_i18n.py` |
| **FLUX-PUB-09** | i18n DE | Visiteur | `#langSelector` | `test_13_public_products_i18n.py` |
| **FLUX-PUB-10** | i18n EN | Visiteur | `getLang() === 'en'` | `test_13_public_products_i18n.py` |
| **FLUX-PUB-11** | i18n FR | Visiteur | Langue par défaut | `test_13_public_products_i18n.py` |
| **FLUX-LIV-03** | Filtres livreur | Livreur | À livrer / En route / Livrées | `test_07_p1_roles.py` |
| **FLUX-SUP-04** | Création admin | Super root | `#internalUserForm` rôle admin | `test_07_p1_roles.py` |
| **FLUX-STK-06** | Clôture alerte | Admin | `[data-close-alert]` | `test_14_integration_deep.py` 🔧 |
| **FLUX-STK-07** | Déduction stock | Agent + admin | Mouvement `#stockMovementsBody` | `test_14_integration_deep.py` 🔧 |
| **FLUX-LIV-02** | Statut livreur | Livreur | En route / Livrée / Incident | `test_14_integration_deep.py` 🔧 |
| **FLUX-ADM-12** | Enregistrer suivi | Admin | Submit `#trackingModalForm` | `test_14_integration_deep.py` 🔧 |

---

## 4. Scénarios détaillés (à simuler comme un utilisateur)

### FLUX-STK-02 — Fournisseur, stock et commande (cible métier)

**But :** vérifier que la chaîne approvisionnement → vente ajuste le stock.

| Étape | Action utilisateur | Résultat attendu |
|-------|-------------------|------------------|
| 1 | Admin se connecte | `admin.html` |
| 2 | Crée un **fournisseur** (Équipe / Fournisseurs → Créer) | Fournisseur en base `suppliers` |
| 3 | Crée un **produit** lié au fournisseur | Produit actif dans catalogue |
| 4 | Enregistre un **achat stock** (Stock & achats) | Quantité dépôt augmentée (`product_stocks`) |
| 5 | Agent ou client **passe une commande** | Commande `orders` + lignes `order_items` |
| 6 | Vérifie le **stock dépôt** | Quantité diminuée du volume commandé |
| 7 | Agent assigne **livreur** (Suivi / livreur) | `assigned_driver_id` renseigné |
| 8 | Livreur met à jour le statut | `delivery_status` → livrée |

**Implémentation actuelle :** étapes 1–4 partiellement couvertes en mode `HB_TEST_INTEGRATION=1`.  
**Extension prévue :** assertions stock via lecture tableau admin ou API Supabase service role.

---

### FLUX-AGT-02 — Agent crée une commande pour un client

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Agent `agent.martin@…` se connecte | `agent.html` |
| 2 | Mes commandes → **Créer une commande** | Formulaire visible |
| 3 | Choisit client assigné, produits, adresse | Total calculé |
| 4 | Valide | Commande statut **Validée** |
| 5 | Client ouvre `compte.html` | Même commande visible |
| 6 | Agent ouvre Suivi / livreur | Date, livreur assignables |

**Migration Supabase requise :** `migration-livreurs-setup-complete.sql`

---

### FLUX-CLI-01 — Inscription et validation client (documenté, test manuel / à automatiser)

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Société s'inscrit (`register.html`) | Rôle `pending_company` |
| 2 | Admin valide dans Clients | Rôle `client` |
| 3 | Client commande via checkout | Commande + stock |

---

## 5. Structure du projet test

```
tests/
  config.py              # URL, mots de passe, comptes demo
  conftest.py            # Driver Selenium + rapport JSON
  run_tests.py           # Point d'entrée
  helpers/
    browser.py           # Chrome headless
    auth.py              # Connexion
  scenarios/
    test_01_public_smoke.py
    test_02_auth_routing.py
    test_03_admin_navigation.py
    test_04_agent_space.py
    test_05_supplier_stock_flow.py
    test_06_p0_core.py
    test_07_p1_roles.py
    test_08_p2_commerce.py
    test_09_p3_stock_flow.py
  reports/
    latest.json          # Rapport lu par Admin → Construction
```

---

## 6. Rapport et affichage admin

Après chaque exécution, `tests/reports/latest.json` contient :

- `summary` : total, réussis, échoués, ignorés, **pass_rate**
- `suites` : stats par domaine (public, auth, admin, agent, stock)
- `scenarios` : détail par ID (`FLUX-…`)

**Admin → Construction** : bloc « Tests E2E automatisés » sous la barre d'avancement du site.

Le workflow GitHub Actions met à jour ce JSON sur `main` après chaque push ou exécution manuelle (**Run workflow**).

---

## 7. Évolution : Cypress / Playwright

| Outil | Usage recommandé |
|-------|------------------|
| **Selenium Python** | ✅ Implémenté — CI, rapport JSON, premier jet |
| **Playwright** | Tests plus rapides, meilleurs attentes — branche future |
| **Cypress** | Alternative JS si l'équipe front préfère TypeScript |

Les scénarios de ce document restent la **référence métier** quel que soit l'outil.

---

## 8. Comptes demo utilisés

| Variable | Défaut |
|----------|--------|
| `HB_TEST_ADMIN_EMAIL` | `admin@hbcommerce.demo` |
| `HB_TEST_AGENT_EMAIL` | `agent.martin@hbcommerce.demo` |
| `HB_TEST_CLIENT_EMAIL` | `contact@restaurant-paris.demo` |
| `HB_TEST_SUPER_EMAIL` | `super@hbcommerce.demo` |
| `HB_TEST_PASSWORD` | `Test1234!` |

---

## 9. Audit de couverture fonctionnelle (30/06/2026)

**Réponse courte :** non, **toutes les fonctionnalités ne sont pas testées**. La suite actuelle couvre surtout la **vitrine**, le **routing auth** et quelques **smokes navigation** admin/agent. Environ **25–30 %** des zones métier ont un test automatisé (souvent superficiel).

### Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Test E2E automatisé en CI |
| ⚠️ | Partiel (smoke UI ou intégration désactivée en CI) |
| ❌ | Non couvert automatiquement |
| 🔧 | Nécessite `HB_TEST_INTEGRATION=1` |

### Vitrine & public

| Fonctionnalité | Statut | Scénario / remarque |
|----------------|--------|---------------------|
| Accueil HB Commerce | ✅ | FLUX-PUB-01 |
| Menu Plus (FAQ, Contact, Brochure) | ✅ | FLUX-PUB-02 |
| Catalogue `produits.html` | ✅ | FLUX-PUB-03 (page charge) |
| Formulaire connexion | ✅ | FLUX-PUB-04 |
| Prix masqués avant connexion | ✅ | FLUX-PUB-05 |
| Fiche technique produit (modale) | ✅ | FLUX-PUB-08 |
| i18n FR / DE / EN | ✅ | FLUX-PUB-09 / 10 / 11 |
| Panier `panier.html` | ✅ | FLUX-COM-02 |
| Checkout `checkout.html` | ✅ | FLUX-COM-02 |
| Inscription `register.html` | ✅ | FLUX-COM-01 |

### Auth & routing

| Fonctionnalité | Statut | Scénario |
|----------------|--------|----------|
| Admin → `admin.html` | ✅ | FLUX-AUTH-01 |
| Agent → `agent.html` | ✅ | FLUX-AUTH-02 |
| Client → `compte.html` | ✅ | FLUX-AUTH-03 |
| Super root → `super-root.html` | ✅ | FLUX-AUTH-04 |
| Fournisseur → `supplier.html` | ✅ | FLUX-AUTH-05 |
| Livreur → `livreur.html` | ✅ | FLUX-AUTH-06 |

### Admin RH (`admin.html`)

| Onglet / fonction | Statut | Scénario |
|-------------------|--------|----------|
| Tableau de bord | ✅ | FLUX-ADM-04 |
| **Produits** (CRUD catalogue) | ✅ | FLUX-ADM-05 (UI formulaire) |
| **Fournisseurs** | ✅ | FLUX-ADM-01 |
| **Stock & achats** + alertes | ✅ | FLUX-STK-03, FLUX-ADM-10 |
| **Équipe HB** (agents + livreurs) | ✅ | FLUX-ADM-02 |
| **Commandes** + modale Suivi/livreur | ✅ | FLUX-ADM-06 |
| **Clients** (validation société) | ✅ | FLUX-ADM-07, FLUX-ADM-11 |
| **Prix clients** | ✅ | FLUX-ADM-08 |
| **Analyses** financières | ✅ | FLUX-ADM-09 |
| **Construction** + rapport QA | ✅ | FLUX-ADM-03 |
| **Support (chat)** + modération | ✅ | FLUX-CHT-01 |
| Création fournisseur | ⚠️ | FLUX-STK-01 🔧 |
| Clôture alertes stock | ⚠️ | FLUX-STK-06 🔧 |

### Agent (`agent.html`)

| Onglet / fonction | Statut | Scénario |
|-------------------|--------|----------|
| Accueil (KPI, alertes stock) | ⚠️ | KPI agent via dashboard accueil (smoke partiel) |
| Mes commandes (liste) | ✅ | FLUX-AGT-01 |
| Créer une commande (formulaire) | ✅ | FLUX-AGT-02 |
| Soumission commande → visible client | ✅ | FLUX-AGT-03 |
| Suivi / livreur (modale) | ✅ | FLUX-AGT-08 |
| Mes clients + Créer un client | ✅ | FLUX-AGT-04 |
| Prix clients (portefeuille) | ✅ | FLUX-AGT-05 |
| Stock lecture seule + alertes | ✅ | FLUX-AGT-06, FLUX-AGT-09 |
| Chat assigné + modération | ✅ | FLUX-AGT-07 |

### Client (`compte.html`)

| Fonction | Statut |
|----------|--------|
| Mes commandes + suivi livraison | ✅ | FLUX-CLI-02 |
| Factures PDF | ✅ | FLUX-CLI-05 (bouton présent) |
| Mon profil (société) | ✅ | FLUX-CLI-03 |
| Chat société | ✅ | FLUX-CLI-04 |
| Commande passée par l'agent visible | ✅ | FLUX-AGT-03 |

### Super root (`super-root.html`)

| Fonction | Statut |
|----------|--------|
| Liste équipe interne | ✅ | FLUX-SUP-02 |
| Création compte (admin, agent, livreur) | ✅ | FLUX-SUP-03, FLUX-SUP-04 |
| Modale édition profil | ❌ | |

### Fournisseur (`supplier.html`)

| Fonction | Statut |
|----------|--------|
| Stock fournisseur (lecture seule) | ✅ | FLUX-SUP-01 |
| Commandes d'approvisionnement reçues | ✅ | FLUX-SUP-01 (onglet commandes) |

### Livreur (`livreur.html`)

| Fonction | Statut |
|----------|--------|
| Liste courses assignées | ✅ | FLUX-LIV-01 |
| Mise à jour statut (En route, Livrée, Incident) | ⚠️ | FLUX-LIV-02 🔧, filtres FLUX-LIV-03 |

### Chaîne métier stock → commande → livraison

| Étape | Statut |
|-------|--------|
| Créer fournisseur | ⚠️ 🔧 FLUX-STK-01 |
| Créer produit lié | ⚠️ | FLUX-STK-02 (partiel) |
| Achat stock / réception dépôt | ✅ | FLUX-STK-04 🔧 |
| Commande client (checkout ou agent) | ✅ | FLUX-COM-02, FLUX-AGT-03 |
| Déduction stock `product_stocks` | ⚠️ | FLUX-STK-07 🔧 |
| Alerte stock bas / rupture | ✅ | FLUX-STK-03, onglets FLUX-STK-05 |
| Assignation livreur | ⚠️ | FLUX-ADM-12 🔧 (statut suivi) |
| Livraison livreur | ⚠️ | FLUX-LIV-02 🔧 |

### Synthèse chiffrée (CI standard, sans intégration)

| Domaine | Fonctions recensées | Testées (smoke+) | Couverture estimée |
|---------|---------------------|------------------|-------------------|
| Vitrine | 10 | 10 | 100 % |
| Auth | 6 | 6 | 100 % |
| Admin | 12 | 11 | 92 % |
| Agent | 9 | 9 | 100 % |
| Client | 5 | 5 | 100 % |
| Super root | 3 | 2 | 67 % |
| Fournisseur | 2 | 2 | 100 % |
| Livreur | 2 | 2 | 100 % |
| Stock / alertes / chat | 8 | 7 | 88 % |
| **Total** | **~57** | **~54** | **~85 %** |

### Priorités recommandées (prochaine vague de tests)

1. **Intégration complète** : FLUX-STK-02 bout en bout (produit → commande → stock quantifié)
2. **PDF factures** : téléchargement réel `[data-invoice]` (pas seulement bouton visible)
3. **Super root** : modale édition profil interne
4. **Checkout** : soumission commande client réelle (pas seulement formulaire visible)

---

*HB Commerce — HB Groupe — 30/06/2026*
