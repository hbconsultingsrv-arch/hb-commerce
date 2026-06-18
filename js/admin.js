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
  const commercialAgent = isCommercialAgentProfile(adminProfile);

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.hidden = true);
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });
  if (commercialAgent) {
    document.querySelectorAll('.admin-only').forEach((el) => { el.style.display = 'none'; });
    document.querySelector('[data-tab="produits"]')?.setAttribute('hidden', '');
    document.getElementById('panel-produits')?.setAttribute('hidden', '');
    document.querySelector('[data-tab="commandes"]')?.click();
  }

  await loadProductsTable();
  await loadOrdersTable();
  await loadClientsPanel();
  await loadAdminPricePanel();
  await loadAdminChatPanel();

  const productForm = document.getElementById('productForm');
  productForm?.addEventListener('submit', handleProductSubmit);
  document.getElementById('cancelProductBtn')?.addEventListener('click', resetProductForm);
  document.getElementById('adminClientForm')?.addEventListener('submit', handleAdminClientSubmit);
  document.getElementById('commercialAgentForm')?.addEventListener('submit', handleCommercialAgentSubmit);
  document.getElementById('refreshClientsBtn')?.addEventListener('click', loadClientsPanel);
  document.getElementById('adminCustomerPriceForm')?.addEventListener('submit', handleAdminCustomerPriceSubmit);
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

async function loadClientsPanel() {
  const body = document.getElementById('clientsBody');
  if (!body) return;
  try {
    adminProfiles = await fetchAllProfiles();
    const clients = adminProfiles.filter((p) => p.role === 'client');
    const agents = adminProfiles.filter((p) => p.role === 'agent_commercial');
    renderAgentSelect(document.getElementById('adminClientAgentSelect'), agents);
    body.innerHTML = clients.length ? clients.map((profile) => `
      <tr>
        <td><strong>${escapeHtml(profile.company || '—')}</strong><br><small>${escapeHtml(profile.address || '')}</small></td>
        <td>${escapeHtml(profile.full_name || '—')}</td>
        <td>${escapeHtml(profile.siren || '—')}</td>
        <td>${escapeHtml(profile.vat_number || '—')}</td>
        <td>
          ${isCommercialAgentProfile(adminProfile) ? escapeHtml(agentName(profile.commercial_agent_id, agents)) : `
            <select data-assign-agent="${profile.id}">
              <option value="">Aucun agent</option>
              ${agents.map((agent) => `<option value="${agent.id}" ${profile.commercial_agent_id === agent.id ? 'selected' : ''}>${escapeHtml(profileLabel(agent))}</option>`).join('')}
            </select>
          `}
        </td>
        <td>${escapeHtml(profile.email || '—')}</td>
      </tr>
    `).join('') : '<tr><td colspan="6">Aucun client.</td></tr>';
    body.querySelectorAll('[data-assign-agent]').forEach((select) => {
      select.addEventListener('change', async () => {
        await assignCommercialAgent(select.dataset.assignAgent, select.value);
        await loadClientsPanel();
        await loadAdminChatPanel();
        await loadAdminPricePanel();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderAgentSelect(select, agents) {
  if (!select) return;
  select.innerHTML = '<option value="">Aucun agent assigné</option>'
    + agents.map((agent) => `<option value="${agent.id}">${escapeHtml(profileLabel(agent))}</option>`).join('');
}

function agentName(agentId, agents) {
  const agent = agents.find((p) => p.id === agentId);
  return agent ? profileLabel(agent) : 'Aucun agent';
}

async function handleCommercialAgentSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('commercialAgentNote');
  const fd = new FormData(e.target);
  try {
    await createCommercialAgentUser({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('full_name'),
      phone: fd.get('phone')
    });
    e.target.reset();
    showAlert(note, 'Agent commercial créé.', 'success');
    await loadClientsPanel();
  } catch (err) {
    showAlert(note, mapAuthError(err));
  }
}

async function handleAdminClientSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('adminClientNote');
  const fd = new FormData(e.target);
  try {
    await createClientUser({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('full_name'),
      phone: fd.get('phone'),
      address: fd.get('address'),
      company: fd.get('company'),
      siren: fd.get('siren'),
      vatNumber: fd.get('vat_number'),
      commercialAgentId: fd.get('commercial_agent_id')
    });
    e.target.reset();
    showAlert(note, 'Client créé avec le rôle client.', 'success');
    await loadClientsPanel();
    await loadAdminChatPanel();
    await loadAdminPricePanel();
  } catch (err) {
    showAlert(note, mapAuthError(err));
  }
}

async function loadAdminPricePanel() {
  const clientSelect = document.getElementById('adminPriceClientSelect');
  const productSelect = document.getElementById('adminPriceProductSelect');
  if (!clientSelect || !productSelect) return;
  const profiles = adminProfiles.length ? adminProfiles : await fetchAllProfiles();
  const clients = profiles.filter((p) => p.role === 'client');
  clientSelect.innerHTML = clients.map((client) => `<option value="${client.id}">${escapeHtml(profileLabel(client))}</option>`).join('');
  const products = await fetchAllProducts();
  productSelect.innerHTML = products.map((product) => `<option value="${product.slug}">${escapeHtml(product.name || product.slug)}</option>`).join('');
}

async function handleAdminCustomerPriceSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('adminCustomerPriceNote');
  const fd = new FormData(e.target);
  try {
    await upsertCustomerPrice({
      profileId: fd.get('profile_id'),
      productSlug: fd.get('product_slug'),
      price: parseFloat(fd.get('price'))
    });
    e.target.reset();
    showAlert(note, 'Prix client fixé.', 'success');
    await loadAdminPricePanel();
  } catch (err) {
    showAlert(note, err.message);
  }
}

function chatStatusLabel(status) {
  if (status === 'pending') return 'En attente';
  if (status === 'rejected') return 'Refusé';
  return 'Validé';
}

async function loadAdminChatPanel() {
  const select = document.getElementById('adminChatCompany');
  if (!select) return;

  let chatProfiles = [];
  try {
    chatProfiles = (await fetchAllProfiles()).filter((p) => p.role === 'client');
  } catch (err) {
    document.getElementById('adminChatHistory').innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }
  select.innerHTML = chatProfiles.length
    ? chatProfiles.map((p) => `<option value="${p.id}">${escapeHtml(profileLabel(p))}</option>`).join('')
    : '<option value="">Aucune société</option>';

  select.addEventListener('change', () => renderAdminChat(select.value));
  document.getElementById('refreshAdminChatBtn')?.addEventListener('click', () => renderAdminChat(select.value));
  document.getElementById('adminChatReplyForm')?.addEventListener('submit', handleAdminChatReply);

  if (chatProfiles[0]) await renderAdminChat(chatProfiles[0].id);
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
