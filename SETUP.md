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

Le script crée les tables et insère le produit phare **FAYAFI**.

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
   - **Redirect URLs** : ajoutez la même URL

> Pour les tests en local, ajoutez aussi `http://localhost:8080`

## 6. Activer l'espace admin

Promouvez votre compte en admin (remplacez l'e-mail) :

```sql
update public.profiles set role = 'admin' where email = 'votre-email@gmail.com';
```

Connectez-vous → accédez à **`admin.html`**

### Dashboard admin

| Onglet | Fonctions |
|--------|-----------|
| **Produits** | Ajouter, modifier, supprimer produits |
| **Commandes** | Suivre et mettre à jour le statut des commandes |

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

## Mettre en ligne

```bash
git add .
git commit -m "Site HB Commerce — commerce alimentaire en gros"
git push
```
