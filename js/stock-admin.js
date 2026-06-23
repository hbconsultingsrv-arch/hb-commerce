/**
 * Admin — réception manuelle, historique mouvements
 */

async function populateStockReceiveProductSelect(products) {
  if (typeof refreshAdminComboboxes === 'function') {
    await refreshAdminComboboxes();
    return;
  }
  if (typeof renderAdminComboboxes === 'function') renderAdminComboboxes(products);
}

async function loadStockMovementsTable() {
  const body = document.getElementById('stockMovementsBody');
  if (!body || typeof fetchRecentStockMovements !== 'function') return;

  const rows = await fetchRecentStockMovements(50);
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">Aucun mouvement enregistré.</td></tr>';
    return;
  }

  const typeLabels = { purchase: 'Réappro / achat', sale: 'Vente', adjustment: 'Casse / perte / ajustement' };

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
  const products = await fetchAllProducts();
  const slug = findProductSlugByInput(fd.get('product_name'), products);
  const quantity = parseInt(fd.get('quantity'), 10);
  const notes = fd.get('notes') || '';

  if (!slug) {
    showAlert(note, 'Produit introuvable — choisissez dans la liste.');
    return;
  }
  if (!quantity || quantity <= 0) {
    showAlert(note, 'Produit et quantité valides requis.');
    return;
  }

  try {
    const newQty = await receiveProductStock({
      productSlug: slug,
      quantity,
      notes: notes || `Réapprovisionnement manuel +${quantity}`
    });
    e.target.reset();
    showAlert(note, `Stock mis à jour : ${newQty} unité${newQty > 1 ? 's' : ''}.`, 'success');
    if (typeof loadProductsTable === 'function') await loadProductsTable();
    if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
    if (typeof renderStockAlertsPanel === 'function') await renderStockAlertsPanel();
    await loadStockMovementsTable();
    await populateStockReceiveProductSelect(products);
  } catch (err) {
    showAlert(note, err.message || 'Erreur lors de la réception stock.');
  }
}

function renderSupplierPurchaseSelectors() {
  if (typeof refreshAdminComboboxes === 'function') {
    refreshAdminComboboxes();
  }
}

async function initStockAdminPanel() {
  if (typeof renderStockAlertsPanel === 'function') await renderStockAlertsPanel();
  if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
  if (typeof renderSupplierPurchaseSelectors === 'function') renderSupplierPurchaseSelectors();
  if (typeof loadSupplierPurchasesTable === 'function') await loadSupplierPurchasesTable();
  if (typeof initStockIncidentsPanel === 'function') await initStockIncidentsPanel();
  const products = await fetchAllProducts();
  await populateStockReceiveProductSelect(products);
  await loadStockMovementsTable();
}

function bindStockAdmin() {
  document.getElementById('stockReceiveForm')?.addEventListener('submit', handleStockReceiveSubmit);
}

document.addEventListener('DOMContentLoaded', () => {
  bindStockAdmin();
});

window.populateStockReceiveProductSelect = populateStockReceiveProductSelect;
window.loadStockMovementsTable = loadStockMovementsTable;
window.initStockAdminPanel = initStockAdminPanel;
window.renderSupplierPurchaseSelectors = renderSupplierPurchaseSelectors;
