let supplierSession = null;
let supplierProfile = null;
let supplierProducts = [];

async function initSupplierSpace() {
  supplierSession = await requireAuth('login.html?redirect=supplier.html');
  if (!supplierSession) return;
  supplierProfile = await getProfile(supplierSession.user.id);
  if (!isSupplierProfile(supplierProfile) || !supplierProfile.supplier_id) {
    window.location.href = 'compte.html';
    return;
  }

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  document.getElementById('refreshSupplierStockBtn')?.addEventListener('click', loadSupplierStock);
  document.getElementById('refreshSupplierOrdersBtn')?.addEventListener('click', loadSupplierOrders);
  bindSectionTabs();

  supplierProducts = await fetchAllProducts();
  await loadSupplierStock();
  await loadSupplierOrders();
}

function productName(slug) {
  return supplierProducts.find((product) => product.slug === slug)?.name || slug;
}

function supplierOrderStatusLabel(status) {
  return supplierOrderStatuses().find(([key]) => key === status)?.[1] || status;
}

function supplierOrderStatusBadge(status) {
  const pillClass = {
    requested: 'stock-pill--low',
    accepted: 'stock-pill--ok',
    in_preparation: 'stock-pill--low',
    shipped: 'stock-pill--ok',
    received: 'stock-pill--ok',
    cancelled: 'stock-pill--out'
  }[status] || '';
  return `<span class="stock-pill ${pillClass}">${escapeHtml(supplierOrderStatusLabel(status))}</span>`;
}

function supplierStockBadge(quantity, reservedQuantity) {
  const available = Math.max(0, (quantity || 0) - (reservedQuantity || 0));
  if (available <= 0) return '<span class="stock-pill stock-pill--out">Indisponible</span>';
  if (available <= 5) return `<span class="stock-pill stock-pill--low">${available} dispo.</span>`;
  return `<span class="stock-pill stock-pill--ok">${available} dispo.</span>`;
}

async function loadSupplierStock() {
  const body = document.getElementById('supplierStockBody');
  if (!body) return;
  const products = supplierProducts.filter((product) => product.supplier_id === supplierProfile.supplier_id);
  const stocks = await fetchSupplierStocks(supplierProfile.supplier_id);
  const stockMap = new Map(stocks.map((stock) => [stock.product_slug, stock]));

  body.innerHTML = products.length ? products.map((product) => {
    const stock = stockMap.get(product.slug) || {};
    const quantity = stock.quantity || 0;
    const reserved = stock.reserved_quantity || 0;
    const leadTime = stock.lead_time_days ?? 7;
    return `
      <tr>
        <td><strong>${escapeHtml(product.name)}</strong></td>
        <td>${quantity}</td>
        <td>${reserved}</td>
        <td>${leadTime} jours</td>
        <td>${supplierStockBadge(quantity, reserved)}</td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="5">Aucun produit rattaché à votre fournisseur.</td></tr>';
}

function formatTracking(order) {
  const parts = [];
  if (order.tracking_number) {
    parts.push(escapeHtml(order.tracking_number));
  }
  if (order.tracking_url) {
    parts.push(`<a href="${escapeHtml(order.tracking_url)}" target="_blank" rel="noopener noreferrer">Suivre</a>`);
  }
  return parts.length ? parts.join('<br>') : '—';
}

async function loadSupplierOrders() {
  const body = document.getElementById('supplierOrdersBody');
  if (!body) return;
  const orders = await fetchSupplierOrders(supplierProfile.supplier_id);
  body.innerHTML = orders.length ? orders.map((order) => `
    <tr>
      <td>${formatDate(order.created_at)}</td>
      <td>${escapeHtml(productName(order.product_slug))}</td>
      <td>${order.quantity}</td>
      <td>${supplierOrderStatusBadge(order.status)}</td>
      <td>${order.expected_arrival_date ? formatDate(order.expected_arrival_date) : '—'}</td>
      <td>${formatTracking(order)}</td>
    </tr>
  `).join('') : '<tr><td colspan="6">Aucune commande fournisseur.</td></tr>';
}

function supplierOrderStatuses() {
  return [
    ['requested', 'Demandée'],
    ['accepted', 'Acceptée'],
    ['in_preparation', 'En préparation'],
    ['shipped', 'Expédiée'],
    ['received', 'Reçue'],
    ['cancelled', 'Annulée']
  ];
}

document.addEventListener('DOMContentLoaded', initSupplierSpace);
