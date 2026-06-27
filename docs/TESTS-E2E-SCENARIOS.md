# Tests E2E — scénarios et flux HB Commerce

**Outil principal :** Selenium + Python + pytest  
**Rapport :** `tests/reports/latest.json` — affiché dans **Admin → Construction**  
**CI :** GitHub Actions `.github/workflows/e2e-tests.yml` (à chaque push / PR sur `main`)

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
| **FLUX-STK-01** | Créer fournisseur | Admin | Formulaire fournisseur (intégration) | `test_05_supplier_stock_flow.py` |
| **FLUX-STK-02** | Fournisseur → stock → commande | Admin + client | Création fournisseur, accès stock (intégration) | `test_05_supplier_stock_flow.py` |

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

Le workflow GitHub Actions met à jour ce JSON sur `main` après chaque push.

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

*HB Commerce — HB Groupe — 30/06/2026*
