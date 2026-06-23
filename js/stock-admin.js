/**
 * Admin — réception manuelle, historique mouvements
 */

function populateStockReceiveProductSelect(products) {
  const select = document.getElementById('stockReceiveProductSelect');
  if (!select) return;
  select.innerHTML = (products || [])
    .map((p) => `<option value="${escapeHtml(p.slug)}">${escapeHtml(p.name)} (${getProductStockQuantity(p)} en stock)</option>`)
    .join('');
}

async function loadStockMovementsTable() {
  const body = document.getElementById('stockMovementsBody');
  if (!body || typeof fetchRecentStockMovements !== 'function') return;

  const rows = await fetchRecentStockMovements(50);
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">Aucun mouvement enregistré.</td></tr>';
    return;
  }

  const typeLabels = { purchase: 'Réappro / achat', sale: 'Vente', adjustment: 'Ajustement' };

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
      notes: notes || `Réapprovisionnement manuel +${quantity}`
    });
    e.target.reset();
    showAlert(note, `Stock mis à jour : ${newQty} unité${newQty > 1 ? 's' : ''}.`, 'success');
    if (typeof loadProductsTable === 'function') await loadProductsTable();
    if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
    if (typeof renderStockAlertsPanel === 'function') await renderStockAlertsPanel();
    await loadStockMovementsTable();
    const products = await fetchAllProducts();
    populateStockReceiveProductSelect(products);
  } catch (err) {
    showAlert(note, err.message || 'Erreur lors de la réception stock.');
  }
}

function renderSupplierPurchaseSelectors() {
  const supplierSelect = document.getElementById('supplierPurchaseSupplierSelect');
  const productSelect = document.getElementById('supplierPurchaseProductSelect');
  if (supplierSelect && adminSuppliers?.length) {
    supplierSelect.innerHTML = adminSuppliers
      .filter((s) => s.active)
      .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
      .join('');
  }
  if (productSelect) {
    fetchAllProducts().then((products) => {
      productSelect.innerHTML = products
        .map((p) => `<option value="${p.slug}">${escapeHtml(p.name || p.slug)}</option>`)
        .join('');
    }).catch(() => {});
  }
}

async function initStockAdminPanel() {
  if (typeof renderStockAlertsPanel === 'function') await renderStockAlertsPanel();
  if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
  if (typeof renderSupplierPurchaseSelectors === 'function') renderSupplierPurchaseSelectors();
  if (typeof loadSupplierPurchasesTable === 'function') await loadSupplierPurchasesTable();
  const products = await fetchAllProducts();
  populateStockReceiveProductSelect(products);
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
