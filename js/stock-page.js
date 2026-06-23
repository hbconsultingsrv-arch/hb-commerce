async function initStockPage() {
  const session = await requireAdmin();
  if (!session) return;

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);

  const orderDate = document.querySelector('#supplierPurchaseForm [name="order_date"]');
  if (orderDate && !orderDate.value) {
    orderDate.value = new Date().toISOString().slice(0, 10);
  }

  if (typeof renderSupplierPurchaseSelectors === 'function') renderSupplierPurchaseSelectors();
  if (typeof initStockAdminPanel === 'function') await initStockAdminPanel();
  await renderLowStockList();
}

async function renderLowStockList() {
  const host = document.getElementById('lowStockList');
  if (!host) return;

  const low = await fetchLowStockProducts();
  if (!low.length) {
    host.innerHTML = '<p class="empty-state success" style="color:var(--green)">✓ Tous les stocks sont au-dessus du seuil.</p>';
    return;
  }

  host.innerHTML = `
    <div class="table-wrap">
      <table class="requests-table">
        <thead><tr><th>Produit</th><th>Stock</th><th>Seuil</th><th>À racheter</th></tr></thead>
        <tbody>
          ${low.map((p) => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td class="stock-admin-cell--${p.stock_quantity <= 0 ? 'out-of-stock' : 'low-stock'}"><strong>${p.stock_quantity}</strong></td>
              <td>${p.min_stock_alert}</td>
              <td>~${p.units_to_reorder} u.</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initStockPage);
