/**
 * Surcharge createOrder — validation stock + déduction automatique
 * Charger APRÈS admin-api.js et stock.js
 */
(function patchCreateOrderWithStock() {
  if (typeof createOrder !== 'function') return;

  const originalCreateOrder = createOrder;

  window.createOrder = async function createOrderWithStock(args) {
    if (typeof checkCartStock === 'function') {
      const check = await checkCartStock(args.items || []);
      if (!check.ok) {
        const details = check.issues
          .map((row) => `${row.product_slug} (${row.available} dispo, ${row.requested} demandé)`)
          .join(' · ');
        throw new Error(`Stock insuffisant — ${details}`);
      }
    }

    const order = await originalCreateOrder(args);

    if (typeof deductStockForOrder === 'function') {
      await deductStockForOrder(order, args.items || [], args.userId);
    }

    return order;
  };
})();
