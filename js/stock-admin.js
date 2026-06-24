/**
 * Admin — alertes stock, réapprovisionnement, historique
 */

async function renderStockAlertBanner() {
  const host = document.getElementById('stockAlertBanner');
  if (!host || typeof fetchLowStockProducts !== 'function') return;

  const low = await fetchLowStockProducts();
  if (!low.length) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }

  host.hidden = false;
  host.innerHTML = `
    <div class="stock-alert-banner" role="alert">
      <strong>⚠ ${low.length} produit${low.length > 1 ? 's' : ''} en stock bas — pensez à racheter</strong>
      <ul>
        ${low.slice(0, 8).map((p) => `
          <li>
            <strong>${escapeHtml(p.name)}</strong> :
            ${p.stock_quantity} restant${p.stock_quantity > 1 ? 's' : ''}
            (seuil ${p.min_stock_alert})
            — manque ~${p.units_to_reorder} unité${p.units_to_reorder > 1 ? 's' : ''}
          </li>
        `).join('')}
        ${low.length > 8 ? `<li>… et ${low.length - 8} autre(s)</li>` : ''}
      </ul>
    </div>
  `;
}

function populateStockReceiveProductSelect(products) {
  const select = document.getElementById('stockReceiveProductSelect');
  if (!select) return;
  select.innerHTML = products
    .map((p) => ` <option value="${escapeHtml(p.slug)}">${escapeHtml(p.name)} (${getProductStockQuantity(p)} en stock)</option> `)
    .join('');
}

async function loadStockMovementsTable() {
  const body = document.getElementById('stockMovementsBody');
  if (!body || typeof fetchRecentStockMovements !== 'function') return;

  const rows = await fetchRecentStockMovements(40);
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">Aucun mouvement enregistré.</td></tr>';
    return;
  }

  const typeLabels = {
    purchase: 'Réappro',
    sale: 'Vente',
    adjustment: 'Ajustement'
  };

  body.innerHTML = rows.map((row) => `
    <tr>
      <td>${formatDateTime(row.created_at)}</td>
      <td>${escapeHtml(row.product_slug)}</td>
      <td><span class="movement-${row.movement_type}">${typeLabels[row.movement_type] || row.movement_type}</span></td>
      <td>${row.quantity_delta > 0 ? '+' : ''}${row.quantity_delta}</td>
      <td>${row.quantity_after}</td>
    </tr>
  `).join('');
}

async function handleStockReceiveSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('stockReceiveNote');
  const fd = new FormData(e.target);
  const slug = fd.get('product_slug');
  const quantity = parseInt(fd.get('quantity'), 10);
  const notes = fd.get('notes') || '';

  if (!slug || !quantity || quantity <= 0) {
    showAlert(note, 'Produit et quantité valides requis.');
    return;
  }

  try {
    const newQty = await receiveProductStock({
      productSlug: slug,
      quantity,
      notes: notes || `Réapprovisionnement +${quantity}`
    });
    e.target.reset();
    showAlert(note, `Stock mis à jour : ${newQty} unité${newQty > 1 ? 's' : ''} en stock.`, 'success');
    await loadProductsTable();
    await renderStockAlertBanner();
    await loadStockMovementsTable();
    const products = await fetchAllProducts();
    populateStockReceiveProductSelect(products);
  } catch (err) {
    showAlert(note, err.message || 'Erreur lors de la réception stock.');
  }
}

function bindStockAdmin() {
  document.getElementById('stockReceiveForm')?.addEventListener('submit', handleStockReceiveSubmit);
}

document.addEventListener('DOMContentLoaded', () => {
  bindStockAdmin();
});
