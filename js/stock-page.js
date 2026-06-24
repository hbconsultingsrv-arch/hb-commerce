async function initStockPage() {
  const session = await requireAdmin();
  if (!session) return;

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);

  const products = await fetchAllProducts();
  populateStockReceiveProductSelect(products);
  await renderStockAlertBanner();
  await renderLowStockList();
  await loadStockMovementsTable();
}

async function renderLowStockList() {
  const host = document.getElementById('lowStockList');
  if (!host) return;

  const low = await fetchLowStockProducts();
  if (!low.length) {
    host.innerHTML = '<p class="empty-state success" style="color:var(--green)">✓ Tous les stocks sont au-dessus du seuil minimum.</p>';
    return;
  }

  host.innerHTML = `
    <div class="table-wrap">
      <table class="requests-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>En stock</th>
            <th>Seuil min.</th>
            <th>À racheter</th>
          </tr>
        </thead>
        <tbody>
          ${low.map((p) => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td class="stock-admin-cell--low-stock"><strong>${p.stock_quantity}</strong></td>
              <td>${p.min_stock_alert}</td>
              <td><strong>~${p.units_to_reorder}</strong> unité${p.units_to_reorder > 1 ? 's' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initStockPage);
