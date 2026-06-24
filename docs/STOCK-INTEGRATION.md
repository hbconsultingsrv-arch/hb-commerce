# Gestion du stock — HB Commerce

## 1. Migration Supabase (obligatoire)

Dans **Supabase → SQL Editor**, exécutez :

`supabase/migration-stock-management.sql`

Cela ajoute :
- `stock_quantity` et `min_stock_alert` sur `products`
- table `stock_movements` (historique)
- fonctions `receive_product_stock`, `deduct_product_stock`, `check_order_stock`
- vue `low_stock_products` (alertes)

## 2. Fichiers ajoutés

| Fichier | Rôle |
|---------|------|
| `stock.html` | Page réapprovisionnement + alertes + historique |
| `js/stock.js` | Utilitaires stock (badges, RPC) |
| `js/stock-admin.js` | Formulaire réappro admin |
| `js/stock-page.js` | Init page stock.html |
| `js/admin-api-stock.js` | Déduction auto à la commande |
| `js/admin-stock.js` | Colonne stock + champs produit admin |
| `js/products-stock.js` | Affichage stock catalogue client |
| `js/cart-stock.js` | Blocage si stock insuffisant au panier |
| `css/stock.css` | Styles alertes |

## 3. Intégration HTML

Si vous avez le dépôt complet :

```powershell
cd C:\Users\Admin\Projects\hb-commerce
.\setup-clone.ps1          # si pas encore cloné
.\integrate-stock.ps1      # branche scripts/CSS dans admin + checkout + catalogue
```

## 4. Fonctionnement

### Admin — produits
- Colonne **Stock** avec quantité + seuil
- Alerte **« Stock bas — racheter »** si `stock_quantity ≤ min_stock_alert`
- Bandeau jaune en haut du dashboard si des produits sont en alerte
- Formulaire produit : **Quantité en stock** + **Seuil alerte (min.)**

### Réapprovisionnement
- Onglet **Réapprovisionner** dans Admin → Produits
- Ou page dédiée : **`stock.html`** (lien « Stock » dans la nav admin)

### Commandes clients
- Vérification stock avant validation checkout
- **Déduction automatique** à chaque commande confirmée
- Historique dans `stock_movements`

## 5. Test local

```powershell
cd C:\Users\Admin\Projects\hb-commerce
python -m http.server 8080
```

- Admin : http://localhost:8080/admin.html
- Stock : http://localhost:8080/stock.html
