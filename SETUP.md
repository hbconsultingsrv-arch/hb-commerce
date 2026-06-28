# Configuration Supabase — HB Commerce

Le site utilise **Supabase** (gratuit) comme backend : authentification, profils, catalogue et commandes.

## 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte gratuit
2. **New project** → nom : `hb-commerce`
3. Choisissez un mot de passe base de données (notez-le)
4. Attendez la création (~2 min)

## 2. Créer les tables

1. Dans Supabase → **SQL Editor** → **New query**
2. Copiez-collez le contenu de `supabase/schema.sql`
3. Cliquez **Run**

Le script crée les tables et insère le produit phare **FIAFI**.

## 3. Récupérer les clés API

1. **Project Settings** → **API**
2. Copiez :
   - **Project URL** → ex. `https://abcdefgh.supabase.co` (**sans** `/rest/v1/`)
   - **anon public** key

## 4. Configurer le site

Copiez `js/config.example.js` vers `js/config.js` et remplacez :

```javascript
window.HB_CONFIG = {
  supabaseUrl: 'https://VOTRE-PROJET.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  stripePublishableKey: 'pk_test_...',
  stripePaymentLink: 'https://buy.stripe.com/...'
};
```

## 5. Activer l'inscription par e-mail

1. **Authentication** → **Providers** → **Email** → activé
2. **Authentication** → **URL Configuration** :
   - **Site URL** : `https://hbconsultingsrv-arch.github.io/hb-commerce/`
   - **Redirect URLs** : ajoutez :
     - `https://hbconsultingsrv-arch.github.io/hb-commerce/`
     - `https://hbconsultingsrv-arch.github.io/hb-commerce/login.html?confirmed=1`
     - `https://hbconsultingsrv-arch.github.io/hb-commerce/**`

> Supprimez `http://localhost:3000` des URL de production si vous ne l'utilisez plus. Pour les tests en local, ajoutez aussi `http://localhost:8080/**`.

## 6. Activer l'espace super root et admin

Exécutez d'abord la migration des accès, prix clients et chat :

```sql
-- Copier-coller le contenu de supabase/migration-access-chat-pricing.sql
```

Si votre base existe déjà, exécutez aussi la migration des champs société client :

```sql
-- Copier-coller le contenu de supabase/migration-company-client-fields.sql
```

Puis exécutez la migration des agents commerciaux :

```sql
-- Copier-coller le contenu de supabase/migration-commercial-agents.sql
```

Enfin, exécutez la migration du suivi livraison et des factures :

```sql
-- Copier-coller le contenu de supabase/migration-order-delivery-tracking.sql
```

Pour activer la gestion des fournisseurs :

```sql
-- Copier-coller le contenu de supabase/migration-suppliers.sql
```

Pour **livreurs**, **assignation** et **commandes créées par l'agent** (script tout-en-un recommandé) :

```sql
-- Copier-coller le contenu de supabase/migration-livreurs-setup-complete.sql
```

Puis, si ce n'est pas déjà fait :

```sql
-- Copier-coller le contenu de supabase/migration-agent-commercial-capabilities.sql
-- Si la connexion affiche « infinite recursion detected in policy for relation profiles » :
-- Copier-coller le contenu de supabase/migration-fix-profiles-rls-recursion.sql
```

> **Important :** n'exécutez pas `migration-agent-driver-assignment.sql` seul — la table `delivery_drivers` doit exister (voir script complet ci-dessus).

Promouvez ensuite votre compte principal en super root (remplacez l'e-mail) :

```sql
update public.profiles set role = 'super_root' where email = 'votre-email@gmail.com';
```

Connectez-vous → accédez à **`super-root.html`** pour gérer les accès et les prix clients.

Le super root peut attribuer le rôle `admin` à un compte pour valider les commandes et modérer le chat via **`admin.html`**.

## 6bis. Jeu de données demo

1. Exécutez les migrations listées ci-dessus
2. Exécutez `supabase/seed-demo-data.sql`
3. Connectez-vous avec les comptes demo (mot de passe **`Test1234!`**)

Documentation complète : **[docs/README.md](docs/README.md)**  
Pages d'exemple en ligne : **[docs/exemples/index.html](docs/exemples/index.html)**  
Cahier des charges : **[docs/cahier-des-charges-hb-commerce.docx](docs/cahier-des-charges-hb-commerce.docx)**  
Présentation : **[docs/presentation-hb-commerce.pptx](docs/presentation-hb-commerce.pptx)**

| Compte | Rôle |
|--------|------|
| `super@hbcommerce.demo` | Super root |
| `admin@hbcommerce.demo` | Admin |
| `agent.martin@hbcommerce.demo` | Agent commercial → `agent.html` |
| `livreur@hbcommerce.demo` | Livreur |
| `contact@restaurant-paris.demo` | Client |
| `stock@fiafi-tunisie.demo` | Fournisseur |

### Dashboard admin

| Onglet | Fonctions |
|--------|-----------|
| **Produits** | Ajouter, modifier, supprimer produits |
| **Commandes** | Valider et mettre à jour le statut des commandes |
| **Chat sociétés** | Répondre aux sociétés et accepter/refuser les messages |

## 7. Paiement Stripe (optionnel)

1. Créez un compte sur [stripe.com](https://stripe.com)
2. **Products** → créez un produit ou un **Payment Link**
3. Collez l'URL du Payment Link dans `stripePaymentLink` dans `config.js`
4. Lors du checkout, si le client choisit « Paiement en ligne », il sera redirigé vers Stripe

## 8. GitHub Pages

1. Sur GitHub → repo **hb-commerce** → **Settings** → **Pages**
2. Source : **Deploy from a branch** → branche `main` → dossier `/ (root)`
3. Le site sera disponible sur : `https://hbconsultingsrv-arch.github.io/hb-commerce/`

## Fonctionnalités client

| Action | Page |
|--------|------|
| Parcourir les produits | `produits.html` |
| Ajouter au panier | Catalogue |
| Passer commande | `checkout.html` (connexion requise) |
| Suivre les commandes | `compte.html` |

## Brochures par marché (France & Luxembourg)

La brochure originale (Arabie saoudite, arabe/anglais) a été remplacée par :

| Marché | Page | Langues |
|--------|------|---------|
| **France** | `brochure-france.html` | Français |
| **Luxembourg** | `brochure-luxembourg.html` | Français + Allemand |

Sur le site : sélecteur de **langue FR / DE / EN** dans la navigation (plus de sélecteur pays LU/FR).

### Images produit par marché

Fichiers locaux (secours) :
- `assets/markets/france/` — visuels France
- `assets/markets/luxembourg/` — visuels Luxembourg

Pour utiliser la photo Google Drive de la brochure : rendez le fichier public, puis les images Drive s'affichent automatiquement (voir `js/markets.js` → `driveId`).

Pour vos propres photos : remplacez `product.svg` par `product.jpg` dans chaque dossier marché et mettez à jour `js/markets.js` si besoin.


Les photos FIAFI sont hébergées sur Google Drive :
`https://drive.google.com/file/d/1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp/view`

**Pour que les images s'affichent sur le site**, le fichier doit être public :

1. Google Drive → ouvrir le fichier → **Partager**
2. **Accès général** → **Tous les utilisateurs disposant du lien** → **Lecteur**
3. Enregistrer

Puis exécutez dans SQL Editor : `supabase/update-fiafi-image.sql`

Pour changer l'image, modifiez l'ID dans `js/branding.js` (`FIAFI_DRIVE_ID`).


Si l'inscription ou la connexion affiche **Failed to fetch** :

1. **Réactiver le projet Supabase** (cause la plus fréquente)
   - Dashboard Supabase → projet `hb-commerce`
   - Si le projet est **Paused**, cliquez **Restore project**
   - Attendez 1–2 minutes que le projet redémarre

2. **URLs d'authentification**
   - **Authentication** → **URL Configuration**
   - **Site URL** : `https://hbconsultingsrv-arch.github.io/hb-commerce/`
   - **Redirect URLs** : ajoutez aussi `http://localhost:8080/**`

3. **Schéma SQL**
   - Exécutez `supabase/schema.sql` si ce n'est pas déjà fait

4. **Test rapide** : ouvrez dans le navigateur  
   `https://mgwshdptwloykxvvipaa.supabase.co/auth/v1/health`  
   Vous devez voir `{"version":"..."}` — pas une erreur 502.

