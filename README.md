# HB Commerce — Commerce alimentaire en gros

Site e-commerce professionnel pour **HB Commerce**, filiale du holding **HB Groupe**.  
Vente en gros de produits alimentaires avec espace client, commandes en ligne et paiement.

**Premier produit :** FIAFI — Huile d'olive extra vierge (origine Tunisie)

## Documentation

| Document | Lien |
|----------|------|
| Index documentation | [docs/README.md](docs/README.md) |
| Cahier des charges (Markdown) | [docs/CAHIER-DES-CHARGES.md](docs/CAHIER-DES-CHARGES.md) |
| Cahier des charges (Word) | [docs/cahier-des-charges-hb-commerce.docx](docs/cahier-des-charges-hb-commerce.docx) |
| Présentation (PowerPoint) | [docs/presentation-hb-commerce.pptx](docs/presentation-hb-commerce.pptx) |
| Présentation web | [docs/presentation/index.html](docs/presentation/index.html) |
| Pages d'exemple & demo | [docs/exemples/index.html](docs/exemples/index.html) |

### Environnement demo

- **Site :** https://hbconsultingsrv-arch.github.io/hb-commerce/
- **Mot de passe :** `Test1234!` (tous les comptes)
- **Script SQL :** `supabase/seed-demo-data.sql`

Comptes principaux : `super@hbcommerce.demo`, `admin@hbcommerce.demo`, `contact@restaurant-paris.demo`, `stock@fiafi-tunisie.demo` — voir [docs/README.md](docs/README.md) pour la liste complète.

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
| `agent.html` | Espace agent commercial (clients, commandes, livraison) |
| `admin.html` | Dashboard admin RH (produits, stock, Équipe HB, …) |
| `super-root.html` | Dashboard super root (comptes HB + livreur) |
| `livreur.html` | Espace livreur (courses assignées) |
| `supplier.html` | Espace fournisseur (stock + commandes d'approvisionnement) |
| `docs/exemples/index.html` | Hub demo et pages d'exemple |

## Backend (Supabase)

Le site est hébergé sur **GitHub Pages** (gratuit). Les données passent par **Supabase** (gratuit) :

- Authentification e-mail / mot de passe
- Profil client : nom, société, e-mail, téléphone, adresse
- Catalogue produits dynamique
- Commandes avec suivi de statut
- Dashboard admin RH pour validation des commandes, Équipe HB et chat sociétés
- Espace agent commercial (`agent.html`) : clients assignés, création commandes, logistique livreur
- Dashboard super root pour gérer les accès internes (admin, agent, livreur)
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
