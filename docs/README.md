# Documentation HB Commerce

Index de la documentation projet, de l'environnement de démonstration et des pages d'exemple.

| Document | Description |
|----------|-------------|
| [Cahier des charges (Markdown)](CAHIER-DES-CHARGES.md) | Spécifications v1.2 avec index demo complet |
| [Cahier des charges (Word)](cahier-des-charges-hb-commerce.docx) | Export Word v1.2 |
| [Présentation (PowerPoint)](presentation-hb-commerce.pptx) | Synthèse projet (slides Office) |
| [Présentation web](presentation/index.html) | Slides interactives + liens pages demo |
| [Pages d'exemple en ligne](exemples/index.html) | Hub demo avec comptes et liens |

## Site de démonstration

**URL :** https://hbconsultingsrv-arch.github.io/hb-commerce/

**Mot de passe (tous les comptes) :** `Test1234!`

**Script SQL :** `supabase/seed-demo-data.sql` (après `schema.sql` et migrations)

## Comptes de démonstration

| E-mail | Rôle | Page principale | Usage |
|--------|------|-----------------|-------|
| `super@hbcommerce.demo` | Super root | [super-root.html](../super-root.html) | Utilisateurs internes HB Commerce |
| `admin@hbcommerce.demo` | Admin | [admin.html](../admin.html) | Catalogue, sociétés, commandes, chat |
| `agent.martin@hbcommerce.demo` | Agent commercial | [admin.html](../admin.html) | Clients Le Jasmin, Traiteur Lyon |
| `agent.dubois@hbcommerce.demo` | Agent commercial | [admin.html](../admin.html) | Clients Bordeaux, Hotel Nice |
| `contact@restaurant-paris.demo` | Client | [compte.html](../compte.html) | Restaurant Le Jasmin |
| `achats@traiteur-lyon.demo` | Client | [compte.html](../compte.html) | Traiteur Lyon Gourmet |
| `commandes@epicerie-bdx.demo` | Client | [compte.html](../compte.html) | Epicerie Bordeaux Sud |
| `direction@hotel-nice.demo` | Client | [compte.html](../compte.html) | Hotel Riviera Nice |
| `inscription@nouvelle-societe.demo` | Société en attente | [compte.html](../compte.html) | Compte `pending_company` |
| `stock@fiafi-tunisie.demo` | Fournisseur | [supplier.html](../supplier.html) | Stock FIAFI Tunisie |

## Pages d'exemple

| Page | Fichier | Description |
|------|---------|-------------|
| Site vitrine | [index.html](../index.html) | Accueil FIAFI |
| Catalogue | [produits.html](../produits.html) | Produits B2B |
| Panier | [panier.html](../panier.html) | Panier professionnel |
| Checkout | [checkout.html](../checkout.html) | Commande et paiement |
| Connexion | [login.html](../login.html) | Authentification |
| Inscription | [register.html](../register.html) | Création compte société |
| Espace client | [compte.html](../compte.html) | Commandes, profil, chat |
| Administration | [admin.html](../admin.html) | Dashboard opérationnel |
| Super root | [super-root.html](../super-root.html) | Gestion interne |
| Fournisseur | [supplier.html](../supplier.html) | Stock et approvisionnement |
| Brochure France | [brochure-france.html](../brochure-france.html) | Marché France |
| Brochure Luxembourg | [brochure-luxembourg.html](../brochure-luxembourg.html) | Marché Luxembourg |

## Migrations Supabase recommandées

1. `supabase/schema.sql`
2. `supabase/migration-access-chat-pricing.sql`
3. `supabase/migration-company-client-fields.sql`
4. `supabase/migration-commercial-agents.sql`
5. `supabase/migration-order-delivery-tracking.sql`
6. `supabase/migration-suppliers.sql`
7. `supabase/migration-chat-moderation-policies.sql`
8. `supabase/seed-demo-data.sql`

## Régénérer les documents Office

```bash
python scripts/generate-docs.py
```
