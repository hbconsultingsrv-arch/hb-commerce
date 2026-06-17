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

## Images produit FAYAFI (Google Drive)

Les photos FAYAFI sont hébergées sur Google Drive :
`https://drive.google.com/file/d/1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp/view`

**Pour que les images s'affichent sur le site**, le fichier doit être public :

1. Google Drive → ouvrir le fichier → **Partager**
2. **Accès général** → **Tous les utilisateurs disposant du lien** → **Lecteur**
3. Enregistrer

Puis exécutez dans SQL Editor : `supabase/update-fayafi-image.sql`

Pour changer l'image, modifiez l'ID dans `js/branding.js` (`FAYAFI_DRIVE_ID`).


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

