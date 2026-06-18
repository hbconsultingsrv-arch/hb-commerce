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
  document.getElementById('supplierName').textContent = supplierProfile.full_name || supplierProfile.email;
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

async function loadSupplierStock() {
  const body = document.getElementById('supplierStockBody');
  if (!body) return;
  const products = supplierProducts.filter((product) => product.supplier_id === supplierProfile.supplier_id);
  const stocks = await fetchSupplierStocks(supplierProfile.supplier_id);
  const stockMap = new Map(stocks.map((stock) => [stock.product_slug, stock]));

  body.innerHTML = products.length ? products.map((product) => {
    const stock = stockMap.get(product.slug) || {};
    return `
      <tr data-stock-row="${product.slug}">
        <td><strong>${escapeHtml(product.name)}</strong></td>
        <td><input type="number" name="quantity" min="0" value="${stock.quantity || 0}" style="width:90px"></td>
        <td><input type="number" name="reserved_quantity" min="0" value="${stock.reserved_quantity || 0}" style="width:90px"></td>
        <td><input type="number" name="lead_time_days" min="0" value="${stock.lead_time_days || 7}" style="width:90px"> jours</td>
        <td><button type="button" class="btn btn-sm btn-primary" data-save-stock="${product.slug}">Enregistrer</button></td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="5">Aucun produit rattaché à votre fournisseur.</td></tr>';

  body.querySelectorAll('[data-save-stock]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = body.querySelector(`[data-stock-row="${btn.dataset.saveStock}"]`);
      await upsertProductStock({
        supplierId: supplierProfile.supplier_id,
        productSlug: btn.dataset.saveStock,
        quantity: parseInt(row.querySelector('[name="quantity"]').value, 10) || 0,
        reservedQuantity: parseInt(row.querySelector('[name="reserved_quantity"]').value, 10) || 0,
        leadTimeDays: parseInt(row.querySelector('[name="lead_time_days"]').value, 10) || 7
      });
      await loadSupplierStock();
    });
  });
}

async function loadSupplierOrders() {
  const body = document.getElementById('supplierOrdersBody');
  if (!body) return;
  const orders = await fetchSupplierOrders(supplierProfile.supplier_id);
  body.innerHTML = orders.length ? orders.map((order) => `
    <tr data-supplier-order="${order.id}">
      <td>${formatDate(order.created_at)}</td>
      <td>${escapeHtml(productName(order.product_slug))}</td>
      <td>${order.quantity}</td>
      <td>
        <select name="status">
          ${supplierOrderStatuses().map(([key, label]) => `<option value="${key}" ${order.status === key ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </td>
      <td><input type="date" name="expected_arrival_date" value="${order.expected_arrival_date || ''}"></td>
      <td>
        <input type="text" name="tracking_number" value="${escapeHtml(order.tracking_number || '')}" placeholder="N° suivi">
        <input type="url" name="tracking_url" value="${escapeHtml(order.tracking_url || '')}" placeholder="Lien suivi">
      </td>
      <td><button type="button" class="btn btn-sm btn-primary" data-save-supplier-order="${order.id}">Enregistrer</button></td>
    </tr>
  `).join('') : '<tr><td colspan="7">Aucune commande fournisseur.</td></tr>';

  body.querySelectorAll('[data-save-supplier-order]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = body.querySelector(`[data-supplier-order="${btn.dataset.saveSupplierOrder}"]`);
      await updateSupplierOrder(btn.dataset.saveSupplierOrder, {
        status: row.querySelector('[name="status"]').value,
        expected_arrival_date: row.querySelector('[name="expected_arrival_date"]').value || null,
        tracking_number: row.querySelector('[name="tracking_number"]').value || null,
        tracking_url: row.querySelector('[name="tracking_url"]').value || null
      });
      await loadSupplierOrders();
    });
  });
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
