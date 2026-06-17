let editingProductId = null;

async function initAdmin() {
  const session = await requireAdmin();
  if (!session) return;

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.hidden = true);
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });

  await loadProductsTable();
  await loadOrdersTable();

  const productForm = document.getElementById('productForm');
  productForm?.addEventListener('submit', handleProductSubmit);
  document.getElementById('cancelProductBtn')?.addEventListener('click', resetProductForm);
}

async function loadProductsTable() {
  const products = await fetchAllProducts();
  const body = document.getElementById('productsBody');
  if (!body) return;

  body.innerHTML = products.map((p) => `
    <tr>
      <td><img src="${p.image_url}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px"></td>
      <td><strong>${p.name}</strong><br><small>${p.origin || ''}</small></td>
      <td>${formatPrice(p.price)} / ${p.unit}</td>
      <td>${p.tag || '—'}</td>
      <td>${p.active ? '✓ Visible' : 'Masqué'}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-dark" data-edit="${p.id}">Modifier</button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-delete="${p.id}">Supprimer</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => editProduct(btn.dataset.edit, products));
  });
  body.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce produit ?')) return;
      await deleteProduct(btn.dataset.delete);
      await loadProductsTable();
    });
  });
}

function editProduct(id, products) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  editingProductId = id;
  const form = document.getElementById('productForm');
  form.name.value = p.name;
  form.slug.value = p.slug;
  form.description.value = p.description || '';
  form.origin.value = p.origin || '';
  form.category.value = p.category || '';
  form.price.value = p.price;
  form.unit.value = p.unit || 'litre';
  form.min_quantity.value = p.min_quantity || 1;
  form.image_url.value = p.image_url;
  form.tag.value = p.tag || '';
  form.sort_order.value = p.sort_order || 0;
  form.active.checked = p.active;
  document.getElementById('productFormTitle').textContent = 'Modifier le produit';
  document.getElementById('saveProductBtn').textContent = 'Enregistrer';
}

function resetProductForm() {
  editingProductId = null;
  const form = document.getElementById('productForm');
  form.reset();
  form.active.checked = true;
  document.getElementById('productFormTitle').textContent = 'Ajouter un produit';
  document.getElementById('saveProductBtn').textContent = 'Ajouter';
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('productNote');
  const fd = new FormData(e.target);

  const product = {
    name: fd.get('name'),
    slug: fd.get('slug') || slugify(fd.get('name')),
    description: fd.get('description'),
    origin: fd.get('origin'),
    category: fd.get('category'),
    price: parseFloat(fd.get('price')),
    unit: fd.get('unit'),
    min_quantity: parseInt(fd.get('min_quantity'), 10) || 1,
    image_url: fd.get('image_url'),
    tag: fd.get('tag'),
    sort_order: parseInt(fd.get('sort_order'), 10) || 0,
    active: fd.has('active')
  };

  try {
    if (editingProductId) {
      await updateProduct(editingProductId, product);
      showAlert(note, 'Produit mis à jour.', 'success');
    } else {
      await createProduct(product);
      showAlert(note, 'Produit ajouté.', 'success');
    }
    resetProductForm();
    await loadProductsTable();
  } catch (err) {
    showAlert(note, err.message);
  }
}

async function loadOrdersTable() {
  const orders = await fetchAllOrders();
  const body = document.getElementById('ordersAdminBody');
  if (!body) return;

  body.innerHTML = orders.map((order) => {
    const items = (order.order_items || [])
      .map((i) => `${i.product_name} × ${i.quantity}`)
      .join(', ');
    const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
    return `
      <tr>
        <td>${formatDate(order.created_at)}</td>
        <td>#${order.id.slice(0, 8)}</td>
        <td>${items}</td>
        <td><strong>${formatPrice(order.total)}</strong></td>
        <td>${order.payment_method || '—'}</td>
        <td>
          <select data-order="${order.id}" class="order-status-select">
            ${Object.entries(ORDER_STATUS_LABELS).map(([k, v]) =>
              `<option value="${k}" ${order.status === k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('.order-status-select').forEach((select) => {
    select.addEventListener('change', async () => {
      await updateOrderStatus(select.dataset.order, select.value);
    });
  });
}

document.addEventListener('DOMContentLoaded', initAdmin);
