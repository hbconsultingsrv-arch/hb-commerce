/**
 * Validation stock à l'ajout panier
 */
(function patchCartStock() {
  if (typeof addToCart !== 'function' || typeof getProductStockQuantity !== 'function') return;

  const original = addToCart;
  window.addToCart = function addToCartWithStock(product, qty) {
    const available = getProductStockQuantity(product);
    const minQty = product.min_quantity || 1;
    const quantity = qty || minQty;

    if (available <= 0) {
      alert(`Rupture de stock pour « ${product.name} ». Réapprovisionnement en cours — contactez HB Commerce.`);
      return;
    }

    if (quantity > available) {
      alert(`Stock insuffisant pour « ${product.name} » : ${available} unité(s) disponible(s).`);
      return;
    }

    original(product, quantity);
  };
})();
