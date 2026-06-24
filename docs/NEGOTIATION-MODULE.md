# Module Négociation Commerciale B2B

## Fichiers

| Fichier | Rôle |
|---------|------|
| `negociations.html` | Centre de négociation (liste, messagerie, dashboard, règles) |
| `js/negotiation-api.js` | API Supabase + règles automatiques |
| `js/negotiation-modal.js` | Modal « Demander un meilleur prix » |
| `js/negotiation-page.js` | Interface page négociations |
| `js/products-catalog.js` | Catalogue avec boutons négociation |
| `js/negotiation-enhance.js` | Enrichit les cartes produit existantes |
| `css/negotiation.css` | Styles premium |
| `supabase/migration-negotiation.sql` | Schéma BDD |
| `supabase/seed-negotiation-rules.sql` | Règles par défaut |

## Installation Supabase

```sql
-- Exécuter dans l'éditeur SQL Supabase
\i migration-negotiation.sql
\i seed-negotiation-rules.sql
```

## Flux métier

1. **Client** clique « Demander un meilleur prix » sur une fiche produit
2. Modal : quantité, prix proposé, message
3. **Règles auto** évaluées (500 L → 3 %, 1000 L → 5 %, 5000 L+ → validation)
4. **Messagerie** temps réel (polling 20 s) entre client et commercial
5. **Commercial** envoie offre (prix, %, fixe, spéciale)
6. **Client** accepte → devis HTML téléchargeable
7. **Conversion** → commande avec prix négocié via `createOrder`

## Accès

- Clients connectés : `negociations.html`, boutons sur `produits.html`
- Backoffice : onglets Dashboard + Règles automatiques
