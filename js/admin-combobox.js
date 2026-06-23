/**
 * Admin — listes avec saisie libre (datalist) pour produits / fournisseurs
 */

const HB_DEFAULT_COUNTRIES = [
  'France', 'Luxembourg', 'Belgique', 'Tunisie', 'Italie', 'Espagne', 'Maroc', 'Allemagne', 'Portugal'
];

function fillAdminDatalist(datalistId, values) {
  const el = document.getElementById(datalistId);
  if (!el) return;
  const unique = [...new Set(
    (values || [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'fr'));
  el.innerHTML = unique.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('');
}

function findSupplierByInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const suppliers = typeof adminSuppliers !== 'undefined' ? adminSuppliers : [];
  const byId = suppliers.find((supplier) => supplier.id === value);
  if (byId) return byId;
  const lower = value.toLowerCase();
  return suppliers.find((supplier) => (supplier.name || '').toLowerCase() === lower) || null;
}

async function resolveSupplierIdFromInput(raw, { createIfMissing = false } = {}) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const existing = findSupplierByInput(value);
  if (existing) return existing.id;
  if (!createIfMissing) return null;
  const created = await createSupplier({ name: value, active: true });
  if (typeof adminSuppliers !== 'undefined') adminSuppliers.push(created);
  if (typeof renderAdminComboboxes === 'function') {
    let products = [];
    try { products = await fetchAllProducts(); } catch { /* ignore */ }
    renderAdminComboboxes(products);
  }
  return created.id;
}

function findProductSlugByInput(raw, products) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const list = products || [];
  const bySlug = list.find((product) => product.slug === value);
  if (bySlug) return bySlug.slug;
  const lower = value.toLowerCase();
  const byName = list.find((product) => (product.name || '').toLowerCase() === lower);
  if (byName) return byName.slug;
  const byPartial = list.find((product) => (product.name || '').toLowerCase().includes(lower));
  return byPartial?.slug || null;
}

function renderAdminComboboxes(products = []) {
  const suppliers = typeof adminSuppliers !== 'undefined' ? adminSuppliers : [];
  const supplierNames = suppliers.filter((supplier) => supplier.active).map((supplier) => supplier.name);
  fillAdminDatalist('supplierNameList', supplierNames);
  fillAdminDatalist('supplierOrderSupplierList', supplierNames);
  fillAdminDatalist('supplierPurchaseSupplierList', supplierNames);

  const productNames = (products || []).map((product) => product.name || product.slug);
  fillAdminDatalist('supplierOrderProductList', productNames);
  fillAdminDatalist('supplierPurchaseProductList', productNames);
  fillAdminDatalist('stockReceiveProductList', productNames);

  fillAdminDatalist('productCategoryList', (products || []).map((product) => product.category));
  fillAdminDatalist('productOriginList', (products || []).map((product) => product.origin));
  fillAdminDatalist('supplierCountryList', [
    ...HB_DEFAULT_COUNTRIES,
    ...suppliers.map((supplier) => supplier.country)
  ]);
}

async function refreshAdminComboboxes() {
  let products = [];
  try {
    products = await fetchAllProducts();
  } catch { /* ignore */ }
  renderAdminComboboxes(products);
}

window.fillAdminDatalist = fillAdminDatalist;
window.findSupplierByInput = findSupplierByInput;
window.resolveSupplierIdFromInput = resolveSupplierIdFromInput;
window.findProductSlugByInput = findProductSlugByInput;
window.renderAdminComboboxes = renderAdminComboboxes;
window.refreshAdminComboboxes = refreshAdminComboboxes;
