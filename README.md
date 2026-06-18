# HB Commerce — Commerce alimentaire en gros

Site e-commerce professionnel pour **HB Commerce**, filiale de **HB Consulting & Services**.  
Vente en gros de produits alimentaires avec espace client, commandes en ligne et paiement.

**Premier produit :** FIAFI — Huile d'olive extra vierge (origine Tunisie)

## Pages

| Fichier | Description |
|---------|-------------|
| `index.html` | Site vitrine + produit phare FIAFI |
| `produits.html` | Catalogue produits |
| `panier.html` | Panier |
| `checkout.html` | Finalisation et paiement |
| `login.html` | Connexion |
| `register.html` | Inscription professionnelle |
| `compte.html` | Espace client (profil + commandes) |
| `admin.html` | Dashboard admin (produits + commandes) |
| `supplier.html` | Espace fournisseur (stock + commandes d'approvisionnement) |

## Backend (Supabase)

Le site est hébergé sur **GitHub Pages** (gratuit). Les données passent par **Supabase** (gratuit) :

- Authentification e-mail / mot de passe
- Profil client : nom, société, e-mail, téléphone, adresse
- Catalogue produits dynamique
- Commandes avec suivi de statut
- Dashboard admin pour validation des commandes et chat sociétés
- Dashboard super root pour gérer les accès et les prix personnalisés par client
- Chat société avec historique et modération des messages
- Gestion des fournisseurs et rattachement fournisseur/produit
- Espace fournisseur pour gérer les stocks et les commandes d'approvisionnement

**Configuration obligatoire** → voir **[SETUP.md](SETUP.md)**

## Lancer en local

```bash
python -m http.server 8080
```

Puis ouvrez http://localhost:8080

## Structure

```
hb-commerce/
├── index.html
├── produits.html
├── panier.html
├── checkout.html
├── login.html
├── register.html
├── compte.html
├── admin.html
├── css/
│   ├── style.css
│   └── commerce.css
├── js/
│   ├── config.js          ← clés Supabase + Stripe
│   ├── auth.js
│   ├── products.js
│   ├── cart.js
│   ├── checkout.js
│   ├── dashboard.js
│   └── admin.js
└── supabase/schema.sql    ← script base de données
```

## Paiement

- **Virement bancaire** — par défaut
- **Chèque** — option disponible
- **Stripe** — configurez un Payment Link dans `js/config.js` (`stripePaymentLink`)

## Coût

- **Supabase Free** : suffisant pour démarrer
- **GitHub Pages** : gratuit (frontend)
