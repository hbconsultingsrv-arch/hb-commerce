let editingProductId = null;
let adminSession = null;
let adminProfile = null;
let adminProfiles = [];

async function initAdmin() {
  adminSession = await requireAdmin();
  if (!adminSession) return;
  adminProfile = await getProfile(adminSession.user.id);

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  const superRootLink = document.getElementById('superRootLink');
  if (superRootLink && isSuperRootProfile(adminProfile)) superRootLink.style.display = '';

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
  await loadAdminChatPanel();

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

function profileLabel(profile) {
  return profile?.company || profile?.full_name || profile?.email || 'Société';
}

function chatStatusLabel(status) {
  if (status === 'pending') return 'En attente';
  if (status === 'rejected') return 'Refusé';
  return 'Validé';
}

async function loadAdminChatPanel() {
  const select = document.getElementById('adminChatCompany');
  if (!select) return;

  try {
    adminProfiles = (await fetchAllProfiles()).filter((p) => p.role === 'client');
  } catch (err) {
    document.getElementById('adminChatHistory').innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }
  select.innerHTML = adminProfiles.length
    ? adminProfiles.map((p) => `<option value="${p.id}">${escapeHtml(profileLabel(p))}</option>`).join('')
    : '<option value="">Aucune société</option>';

  select.addEventListener('change', () => renderAdminChat(select.value));
  document.getElementById('refreshAdminChatBtn')?.addEventListener('click', () => renderAdminChat(select.value));
  document.getElementById('adminChatReplyForm')?.addEventListener('submit', handleAdminChatReply);

  if (adminProfiles[0]) await renderAdminChat(adminProfiles[0].id);
}

async function renderAdminChat(companyId) {
  const host = document.getElementById('adminChatHistory');
  if (!host) return;
  if (!companyId) {
    host.innerHTML = '<p class="empty-state">Aucune société sélectionnée.</p>';
    return;
  }

  let messages = [];
  try {
    messages = await fetchChatMessages(companyId);
  } catch (err) {
    host.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }
  if (!messages.length) {
    host.innerHTML = '<p class="empty-state">Aucun message avec cette société.</p>';
    return;
  }

  host.innerHTML = messages.map((msg) => `
    <article class="chat-message ${msg.author_role === 'client' ? 'from-client' : 'from-admin'}">
      <div class="chat-meta">
        <strong>${msg.author_role === 'client' ? escapeHtml(profileLabel(msg.company)) : 'Administration'}</strong>
        <span>${formatDate(msg.created_at)}</span>
        <span class="chat-status ${msg.status}">${chatStatusLabel(msg.status)}</span>
      </div>
      <p>${escapeHtml(msg.message)}</p>
      ${msg.author_role === 'client' ? `
        <div class="form-actions" style="margin-top:0.65rem">
          <button type="button" class="btn btn-sm btn-primary" data-chat-approve="${msg.id}" ${msg.status === 'approved' ? 'disabled' : ''}>Valider</button>
          <button type="button" class="btn btn-sm btn-outline-dark" data-chat-reject="${msg.id}" ${msg.status === 'rejected' ? 'disabled' : ''}>Refuser</button>
        </div>
      ` : ''}
    </article>
  `).join('');
  host.scrollTop = host.scrollHeight;

  host.querySelectorAll('[data-chat-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await moderateChatMessage(btn.dataset.chatApprove, 'approved', adminSession.user.id);
      await renderAdminChat(companyId);
    });
  });
  host.querySelectorAll('[data-chat-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await moderateChatMessage(btn.dataset.chatReject, 'rejected', adminSession.user.id);
      await renderAdminChat(companyId);
    });
  });
}

async function handleAdminChatReply(e) {
  e.preventDefault();
  const note = document.getElementById('adminChatNote');
  const select = document.getElementById('adminChatCompany');
  const companyId = select?.value;
  if (!companyId) return;

  const fd = new FormData(e.target);
  try {
    await sendAdminChatMessage({
      companyId,
      authorId: adminSession.user.id,
      authorRole: adminProfile.role,
      message: fd.get('message')
    });
    e.target.reset();
    showAlert(note, 'Réponse envoyée.', 'success');
    await renderAdminChat(companyId);
  } catch (err) {
    showAlert(note, err.message);
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
