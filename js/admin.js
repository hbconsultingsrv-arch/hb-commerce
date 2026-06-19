let editingProductId = null;
let editingSupplierId = null;
let adminSession = null;
let adminProfile = null;
let adminProfiles = [];
let adminSuppliers = [];
let adminSelectedChatCompanyId = null;
let adminChatBound = false;
let adminOrders = [];

function showAdminTab(tabId) {
  if (!tabId) return;
  document.querySelectorAll('.admin-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.admin-panel').forEach((p) => {
    p.hidden = true;
  });
  const panel = document.getElementById(`panel-${tabId}`);
  if (panel) panel.hidden = false;
}

function bindAdminTabs() {
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => showAdminTab(tab.dataset.tab));
  });
}

function initSectionTabScopes() {
  document.querySelectorAll('[data-tab-scope]').forEach((scope) => {
    const activeTab = scope.querySelector('.section-tab.active');
    const sectionId = activeTab?.dataset.section
      || scope.querySelector('[data-section-panel]:not([hidden])')?.dataset.sectionPanel
      || scope.querySelector('[data-section-panel]')?.dataset.sectionPanel;
    if (sectionId) activateSectionTabScope(scope, sectionId);
  });
}

async function initAdmin() {
  adminSession = await requireAdmin();
  if (!adminSession) return;
  adminProfile = await getProfile(adminSession.user.id);

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  const superRootLink = document.getElementById('superRootLink');
  if (superRootLink && isSuperRootProfile(adminProfile)) superRootLink.style.display = '';
  const commercialAgent = isCommercialAgentProfile(adminProfile);
  if (!isSuperRootProfile(adminProfile)) {
    document.querySelectorAll('.super-root-only').forEach((el) => el.remove());
  }

  bindAdminTabs();
  if (commercialAgent) {
    document.querySelectorAll('.admin-only').forEach((el) => { el.style.display = 'none'; });
    document.querySelector('[data-tab="produits"]')?.setAttribute('hidden', '');
    document.getElementById('panel-produits')?.setAttribute('hidden', '');
    showAdminTab('commandes');
  } else {
    showAdminTab('produits');
  }

  if (!commercialAgent) {
    await loadSuppliersTable();
    await loadProductsTable();
  }
  await loadOrdersTable();
  await loadClientsPanel();
  await loadAdminPricePanel();
  await loadAdminChatPanel();

  const productForm = document.getElementById('productForm');
  productForm?.addEventListener('submit', handleProductSubmit);
  document.getElementById('cancelProductBtn')?.addEventListener('click', resetProductForm);
  document.getElementById('supplierForm')?.addEventListener('submit', handleSupplierSubmit);
  document.getElementById('cancelSupplierBtn')?.addEventListener('click', resetSupplierForm);
  document.getElementById('refreshSuppliersBtn')?.addEventListener('click', loadSuppliersTable);
  document.getElementById('supplierOrderForm')?.addEventListener('submit', handleSupplierOrderSubmit);
  document.getElementById('adminClientForm')?.addEventListener('submit', handleAdminClientSubmit);
  document.getElementById('adminCompanyTypeSelect')?.addEventListener('change', syncCompanyTypeFields);
  document.getElementById('refreshClientsBtn')?.addEventListener('click', loadClientsPanel);
  document.getElementById('adminCustomerPriceForm')?.addEventListener('submit', handleAdminCustomerPriceSubmit);
  syncCompanyTypeFields();
  bindSectionTabs();
  initSectionTabScopes();
  bindAppModal('trackingModal');
  document.getElementById('trackingModalForm')?.addEventListener('submit', handleTrackingModalSubmit);
  populateTrackingStatusSelect();
  bindAdminChatModeration();
}

async function loadProductsTable() {
  const products = await fetchAllProducts();
  const body = document.getElementById('productsBody');
  if (!body) return;
  if (!adminSuppliers.length) adminSuppliers = await fetchAllSuppliers();
  renderProductSupplierSelect();
  const supplierMap = new Map(adminSuppliers.map((supplier) => [supplier.id, supplier]));

  body.innerHTML = products.map((p) => `
    <tr>
      <td><img src="${p.image_url}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px"></td>
      <td><strong>${p.name}</strong><br><small>${p.origin || ''}</small></td>
      <td>${escapeHtml(supplierMap.get(p.supplier_id)?.name || '—')}</td>
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
  if (form.supplier_id) form.supplier_id.value = p.supplier_id || '';
  form.min_quantity.value = p.min_quantity || 1;
  form.image_url.value = p.image_url;
  form.tag.value = p.tag || '';
  form.sort_order.value = p.sort_order || 0;
  form.active.checked = p.active;
  document.getElementById('productFormTitle').textContent = 'Modifier le produit';
  document.getElementById('saveProductBtn').textContent = 'Enregistrer';
  activateSectionTab('panel-produits', 'formulaire');
}

function resetProductForm() {
  editingProductId = null;
  const form = document.getElementById('productForm');
  form.reset();
  form.active.checked = true;
  document.getElementById('productFormTitle').textContent = 'Ajouter un produit';
  document.getElementById('saveProductBtn').textContent = 'Ajouter';
  activateSectionTab('panel-produits', 'liste');
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
    supplier_id: fd.get('supplier_id') || null,
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
    activateSectionTab('panel-produits', 'liste');
    await loadProductsTable();
  } catch (err) {
    showAlert(note, err.message);
  }
}

function renderProductSupplierSelect() {
  const select = document.getElementById('productSupplierSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Aucun fournisseur</option>'
    + adminSuppliers
      .filter((supplier) => supplier.active)
      .map((supplier) => `<option value="${supplier.id}">${escapeHtml(supplier.name)}</option>`)
      .join('');
  renderSupplierOrderSelectors();
}

function renderSupplierOrderSelectors() {
  const supplierSelect = document.getElementById('supplierOrderSupplierSelect');
  const productSelect = document.getElementById('supplierOrderProductSelect');
  if (supplierSelect) {
    supplierSelect.innerHTML = adminSuppliers
      .filter((supplier) => supplier.active)
      .map((supplier) => `<option value="${supplier.id}">${escapeHtml(supplier.name)}</option>`)
      .join('');
  }
  if (productSelect) {
    fetchAllProducts().then((products) => {
      productSelect.innerHTML = products
        .map((product) => `<option value="${product.slug}">${escapeHtml(product.name || product.slug)}</option>`)
        .join('');
    }).catch(() => {});
  }
}

async function loadSuppliersTable() {
  const body = document.getElementById('suppliersBody');
  try {
    adminSuppliers = await fetchAllSuppliers();
    renderProductSupplierSelect();
    if (!body) return;
    body.innerHTML = adminSuppliers.length ? adminSuppliers.map((supplier) => `
      <tr>
        <td><strong>${escapeHtml(supplier.name)}</strong><br><small>${escapeHtml(supplier.address || '')}</small></td>
        <td>${escapeHtml(supplier.contact_name || '—')}<br><small>${escapeHtml(supplier.email || '')}</small></td>
        <td>${escapeHtml(supplier.country || '—')}</td>
        <td>${escapeHtml(supplier.vat_number || '—')}</td>
        <td>${supplier.active ? '✓ Actif' : 'Inactif'}</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-dark" data-edit-supplier="${supplier.id}">Modifier</button>
          <button type="button" class="btn btn-sm btn-outline-dark" data-delete-supplier="${supplier.id}">Supprimer</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6">Aucun fournisseur.</td></tr>';

    body.querySelectorAll('[data-edit-supplier]').forEach((btn) => {
      btn.addEventListener('click', () => editSupplier(btn.dataset.editSupplier));
    });
    body.querySelectorAll('[data-delete-supplier]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce fournisseur ? Les produits liés resteront sans fournisseur.')) return;
        await deleteSupplier(btn.dataset.deleteSupplier);
        await loadSuppliersTable();
        await loadProductsTable();
      });
    });
  } catch (err) {
    if (body) body.innerHTML = `<tr><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
  }
}

function editSupplier(id) {
  const supplier = adminSuppliers.find((item) => item.id === id);
  const form = document.getElementById('supplierForm');
  if (!supplier || !form) return;

  editingSupplierId = id;
  form.name.value = supplier.name || '';
  form.contact_name.value = supplier.contact_name || '';
  form.email.value = supplier.email || '';
  form.phone.value = supplier.phone || '';
  form.address.value = supplier.address || '';
  form.country.value = supplier.country || '';
  form.siren.value = supplier.siren || '';
  form.vat_number.value = supplier.vat_number || '';
  form.notes.value = supplier.notes || '';
  if (form.supplier_password) form.supplier_password.value = '';
  form.active.checked = supplier.active;
  document.getElementById('supplierFormTitle').textContent = 'Modifier le fournisseur';
  document.getElementById('saveSupplierBtn').textContent = 'Enregistrer';
  activateSectionTab('panel-fournisseurs', 'ajouter');
}

function resetSupplierForm() {
  editingSupplierId = null;
  const form = document.getElementById('supplierForm');
  if (!form) return;
  form.reset();
  form.active.checked = true;
  document.getElementById('supplierFormTitle').textContent = 'Ajouter un fournisseur';
  document.getElementById('saveSupplierBtn').textContent = 'Ajouter';
}

async function handleSupplierSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('supplierNote');
  const fd = new FormData(e.target);
  const supplier = {
    name: fd.get('name'),
    contact_name: fd.get('contact_name') || '',
    email: fd.get('email') || '',
    phone: fd.get('phone') || '',
    address: fd.get('address') || '',
    country: fd.get('country') || '',
    siren: fd.get('siren') || '',
    vat_number: fd.get('vat_number') || '',
    notes: fd.get('notes') || '',
    active: fd.has('active')
  };

  try {
    let savedSupplier = null;
    if (editingSupplierId) {
      savedSupplier = await updateSupplier(editingSupplierId, supplier);
      showAlert(note, 'Fournisseur mis à jour.', 'success');
    } else {
      savedSupplier = await createSupplier(supplier);
      showAlert(note, 'Fournisseur ajouté.', 'success');
    }
    const password = fd.get('supplier_password');
    if (password && savedSupplier?.email) {
      await createSupplierUser({
        supplierId: savedSupplier.id,
        email: savedSupplier.email,
        password,
        fullName: savedSupplier.contact_name || savedSupplier.name,
        phone: savedSupplier.phone
      });
      showAlert(note, 'Fournisseur et compte fournisseur créés.', 'success');
    }
    resetSupplierForm();
    activateSectionTab('panel-fournisseurs', 'liste');
    await loadSuppliersTable();
    await loadProductsTable();
  } catch (err) {
    showAlert(note, err.message);
  }
}

async function handleSupplierOrderSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('supplierOrderNote');
  const fd = new FormData(e.target);
  try {
    await createSupplierOrder({
      supplier_id: fd.get('supplier_id'),
      product_slug: fd.get('product_slug'),
      quantity: parseInt(fd.get('quantity'), 10),
      expected_arrival_date: fd.get('expected_arrival_date') || null,
      notes: fd.get('notes') || ''
    });
    e.target.reset();
    showAlert(note, 'Commande fournisseur créée.', 'success');
  } catch (err) {
    showAlert(note, err.message);
  }
}

async function loadOrdersTable() {
  adminOrders = await fetchAllOrders();
  const body = document.getElementById('ordersAdminBody');
  if (!body) return;

  body.innerHTML = adminOrders.map((order) => {
    const items = (order.order_items || [])
      .map((i) => `${i.product_name} × ${i.quantity}`)
      .join(', ');
    const deliveryLabel = DELIVERY_STATUS_LABELS[order.delivery_status || 'non_preparee'] || 'Non préparée';
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
        <td>
          <div class="tracking-cell">
            <span class="tracking-status">${escapeHtml(deliveryLabel)}</span>
            <button type="button" class="btn btn-sm btn-outline-dark" data-open-tracking="${order.id}">Suivi</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('.order-status-select').forEach((select) => {
    select.addEventListener('change', async () => {
      await updateOrderStatus(select.dataset.order, select.value);
    });
  });
  body.querySelectorAll('[data-open-tracking]').forEach((btn) => {
    btn.addEventListener('click', () => openTrackingModal(btn.dataset.openTracking));
  });
}

function populateTrackingStatusSelect() {
  const select = document.getElementById('trackingDeliveryStatus');
  if (!select) return;
  select.innerHTML = Object.entries(DELIVERY_STATUS_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

function openTrackingModal(orderId) {
  const order = adminOrders.find((item) => item.id === orderId);
  const form = document.getElementById('trackingModalForm');
  if (!order || !form) return;

  form.elements.order_id.value = order.id;
  form.elements.delivery_status.value = order.delivery_status || 'non_preparee';
  form.elements.carrier.value = order.carrier || '';
  form.elements.tracking_number.value = order.tracking_number || '';
  form.elements.tracking_url.value = order.tracking_url || '';
  form.elements.estimated_delivery_date.value = order.estimated_delivery_date || '';
  form.elements.delivered_at.value = toDatetimeLocal(order.delivered_at);
  form.elements.delivery_notes.value = order.delivery_notes || '';
  document.getElementById('trackingModalTitle').textContent = `Livraison / suivi — #${order.id.slice(0, 8)}`;
  showAlert(document.getElementById('trackingModalNote'), '');
  openAppModal('trackingModal');
}

async function handleTrackingModalSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('trackingModalNote');
  const fd = new FormData(e.target);
  const orderId = fd.get('order_id');
  if (!orderId) {
    showAlert(note, 'Commande introuvable.');
    return;
  }

  try {
    await updateOrderTracking(orderId, {
      delivery_status: fd.get('delivery_status'),
      carrier: fd.get('carrier') || null,
      tracking_number: fd.get('tracking_number') || null,
      tracking_url: fd.get('tracking_url') || null,
      estimated_delivery_date: fd.get('estimated_delivery_date') || null,
      delivered_at: toIsoOrNull(fd.get('delivered_at')),
      delivery_notes: fd.get('delivery_notes') || null
    });
    showAlert(note, 'Suivi livraison enregistré.', 'success');
    closeAppModal('trackingModal');
    await loadOrdersTable();
  } catch (err) {
    showAlert(note, err.message);
  }
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

function profileLabel(profile) {
  return profile?.company || profile?.full_name || profile?.email || 'Société';
}

function personLabel(profile) {
  return profile?.full_name || profile?.email || profile?.company || 'Utilisateur';
}

function commercialAgentLabel(profile) {
  const roleLabel = {
    agent_commercial: 'agent commercial',
    admin: 'admin',
    super_root: 'super root'
  }[profile?.role] || profile?.role || 'agent';
  return `${personLabel(profile)} (${roleLabel})`;
}

async function loadClientsPanel() {
  const body = document.getElementById('clientsBody');
  if (!body) return;
  try {
    adminProfiles = await fetchAllProfiles();
    const clients = adminProfiles.filter((p) => ['pending_company', 'client', 'supplier'].includes(p.role));
    const agents = adminProfiles.filter(isCommercialAssignableProfile);
    renderAgentSelect(document.getElementById('adminClientAgentSelect'), agents);
    body.innerHTML = clients.length ? clients.map((profile) => `
      <tr>
        <td><strong>${escapeHtml(profile.company || '—')}</strong><br><small>${escapeHtml(profile.address || '')}</small></td>
        <td>
          ${isCommercialAgentProfile(adminProfile) ? companyRoleLabel(profile.role) : `
            <select data-company-role="${profile.id}">
              ${['pending_company', 'client', 'supplier'].map((role) => `<option value="${role}" ${profile.role === role ? 'selected' : ''}>${companyRoleLabel(role)}</option>`).join('')}
            </select>
          `}
        </td>
        <td>${escapeHtml(profile.full_name || '—')}</td>
        <td>${escapeHtml(profile.siren || '—')}</td>
        <td>${escapeHtml(profile.vat_number || '—')}</td>
        <td>
          ${isCommercialAgentProfile(adminProfile) ? escapeHtml(agentName(profile.commercial_agent_id, agents)) : `
            <select data-assign-agent="${profile.id}">
              <option value="">Aucun agent</option>
              ${agents.map((agent) => `<option value="${agent.id}" ${profile.commercial_agent_id === agent.id ? 'selected' : ''}>${escapeHtml(commercialAgentLabel(agent))}</option>`).join('')}
            </select>
          `}
        </td>
        <td>${escapeHtml(profile.email || '—')}</td>
      </tr>
    `).join('') : '<tr><td colspan="7">Aucune société.</td></tr>';
    body.querySelectorAll('[data-assign-agent]').forEach((select) => {
      select.addEventListener('change', async () => {
        await assignCommercialAgent(select.dataset.assignAgent, select.value);
        await loadClientsPanel();
        await loadAdminChatPanel();
        await loadAdminPricePanel();
      });
    });
    body.querySelectorAll('[data-company-role]').forEach((select) => {
      select.addEventListener('change', async () => {
        await updateCompanyRole(select.dataset.companyRole, select.value);
        await loadClientsPanel();
        await loadAdminChatPanel();
        await loadAdminPricePanel();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function updateCompanyRole(profileId, role) {
  const profile = adminProfiles.find((p) => p.id === profileId);
  const fields = { role };
  if (role === 'supplier') {
    let supplierId = profile?.supplier_id;
    if (!supplierId) {
      const supplier = await createSupplier({
        name: profile?.company || profile?.full_name || profile?.email || 'Fournisseur',
        contact_name: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        siren: profile?.siren || '',
        vat_number: profile?.vat_number || '',
        active: true
      });
      supplierId = supplier.id;
    }
    fields.supplier_id = supplierId;
    fields.commercial_agent_id = null;
  }
  if (role === 'client' || role === 'pending_company') {
    fields.supplier_id = null;
  }
  await updateProfileAsSuperRoot(profileId, fields);
}

function companyRoleLabel(role) {
  return {
    pending_company: 'À affecter',
    client: 'Client',
    supplier: 'Fournisseur'
  }[role] || role || '—';
}

function renderAgentSelect(select, agents) {
  if (!select) return;
  select.innerHTML = '<option value="">Aucun agent assigné</option>'
    + agents.map((agent) => `<option value="${agent.id}">${escapeHtml(commercialAgentLabel(agent))}</option>`).join('');
}

function agentName(agentId, agents) {
  const agent = agents.find((p) => p.id === agentId);
  return agent ? commercialAgentLabel(agent) : 'Aucun agent';
}

function syncCompanyTypeFields() {
  const type = document.getElementById('adminCompanyTypeSelect')?.value || 'client';
  document.querySelectorAll('.client-only-field').forEach((el) => {
    el.style.display = type === 'client' ? '' : 'none';
  });
}

async function handleAdminClientSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('adminClientNote');
  const fd = new FormData(e.target);
  const companyType = fd.get('company_type');
  try {
    if (companyType === 'supplier') {
      const supplier = await createSupplier({
        name: fd.get('company'),
        contact_name: fd.get('full_name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        siren: fd.get('siren'),
        vat_number: fd.get('vat_number'),
        active: true
      });
      await createSupplierUser({
        supplierId: supplier.id,
        email: fd.get('email'),
        password: fd.get('password'),
        fullName: fd.get('full_name'),
        phone: fd.get('phone')
      });
    } else {
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
    }
    e.target.reset();
    showAlert(note, companyType === 'supplier' ? 'Société fournisseur créée.' : 'Société cliente créée.', 'success');
    activateSectionTab('panel-clients', 'liste');
    await loadClientsPanel();
    await loadSuppliersTable();
    await loadAdminChatPanel();
    await loadAdminPricePanel();
    syncCompanyTypeFields();
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

function renderChatModerationActions(message) {
  if (message.author_role !== 'client' || message.status !== 'pending') return '';
  return `
    <div class="form-actions chat-moderation-actions">
      <button type="button" class="btn btn-sm btn-primary" data-chat-approve="${message.id}">Valider</button>
      <button type="button" class="btn btn-sm btn-outline-dark" data-chat-reject="${message.id}">Refuser</button>
    </div>
  `;
}

async function handleChatModeration(messageId, status, button) {
  const note = document.getElementById('adminChatNote');
  if (!messageId || !adminSession?.user?.id) {
    showAlert(note, 'Session expirée. Reconnectez-vous.');
    return;
  }

  const label = status === 'approved' ? 'Validation' : 'Refus';
  button.disabled = true;
  showAlert(note, `${label} en cours…`, 'success');

  try {
    await moderateChatMessage(messageId, status, adminSession.user.id);
    showAlert(note, status === 'approved' ? 'Message validé.' : 'Message refusé.', 'success');
    await loadAdminChatPanel();
  } catch (err) {
    showAlert(note, err.message || 'Impossible de modérer ce message.');
    button.disabled = false;
  }
}

function bindAdminChatModeration() {
  const host = document.getElementById('adminChatHistory');
  if (!host || host.dataset.moderationBound === '1') return;
  host.dataset.moderationBound = '1';
  host.addEventListener('click', async (event) => {
    const approveBtn = event.target.closest('[data-chat-approve]');
    const rejectBtn = event.target.closest('[data-chat-reject]');
    const button = approveBtn || rejectBtn;
    if (!button || button.disabled) return;
    event.preventDefault();
    const messageId = button.dataset.chatApprove || button.dataset.chatReject;
    const status = approveBtn ? 'approved' : 'rejected';
    await handleChatModeration(messageId, status, button);
  });
}

function chatStatusLabel(status) {
  if (status === 'pending') return 'En attente';
  if (status === 'rejected') return 'Refusé';
  return 'Validé';
}

function getChatEligibleProfiles(profiles) {
  const clients = profiles.filter((profile) => profile.role === 'client');
  if (isCommercialAgentProfile(adminProfile)) {
    return clients.filter((profile) => profile.commercial_agent_id === adminProfile.id);
  }
  return clients;
}

function buildChatSummaries(profiles, messages) {
  const summaries = new Map(
    profiles.map((profile) => [profile.id, {
      profile,
      pendingCount: 0,
      lastMessage: null,
      lastAt: null
    }])
  );

  messages.forEach((message) => {
    const summary = summaries.get(message.company_id);
    if (!summary) return;
    if (message.status === 'pending' && message.author_role === 'client') {
      summary.pendingCount += 1;
    }
    if (!summary.lastAt || new Date(message.created_at) > new Date(summary.lastAt)) {
      summary.lastAt = message.created_at;
      summary.lastMessage = message;
    }
  });

  return [...summaries.values()].sort((a, b) => {
    const dateA = a.lastAt ? new Date(a.lastAt).getTime() : 0;
    const dateB = b.lastAt ? new Date(b.lastAt).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return profileLabel(a.profile).localeCompare(profileLabel(b.profile), 'fr');
  });
}

function chatPreview(message) {
  if (!message) return 'Aucun message';
  const text = String(message.message || '').trim();
  if (!text) return 'Aucun message';
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}

function syncAdminChatReplyForm(companyId) {
  const form = document.getElementById('adminChatReplyForm');
  if (!form) return;
  const disabled = !companyId;
  form.querySelector('textarea')?.toggleAttribute('disabled', disabled);
  form.querySelector('button[type="submit"]')?.toggleAttribute('disabled', disabled);
}

async function loadAdminChatPanel() {
  const listHost = document.getElementById('adminChatList');
  if (!listHost) return;

  let profiles = [];
  let messages = [];
  try {
    profiles = getChatEligibleProfiles(await fetchAllProfiles());
    messages = await fetchChatMessages();
  } catch (err) {
    listHost.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }

  const summaries = buildChatSummaries(profiles, messages);
  if (!summaries.length) {
    listHost.innerHTML = '<p class="empty-state">Aucune société client disponible.</p>';
    adminSelectedChatCompanyId = null;
    syncAdminChatReplyForm(null);
    return;
  }

  if (!adminSelectedChatCompanyId || !summaries.some((item) => item.profile.id === adminSelectedChatCompanyId)) {
    adminSelectedChatCompanyId = summaries[0].profile.id;
  }

  listHost.innerHTML = summaries.map(({ profile, pendingCount, lastMessage, lastAt }) => `
    <button
      type="button"
      class="chat-thread-item ${profile.id === adminSelectedChatCompanyId ? 'active' : ''}"
      data-chat-company="${profile.id}"
    >
      <span class="chat-thread-title">${escapeHtml(profileLabel(profile))}</span>
      <span class="chat-thread-preview">${escapeHtml(chatPreview(lastMessage))}</span>
      <span class="chat-thread-meta">
        <span>${lastAt ? escapeHtml(formatDateTime(lastAt)) : '—'}</span>
        ${pendingCount ? `<span class="chat-thread-badge">${pendingCount} en attente</span>` : ''}
      </span>
    </button>
  `).join('');

  listHost.querySelectorAll('[data-chat-company]').forEach((button) => {
    button.addEventListener('click', async () => {
      adminSelectedChatCompanyId = button.dataset.chatCompany;
      listHost.querySelectorAll('.chat-thread-item').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      await renderAdminChat(adminSelectedChatCompanyId);
    });
  });

  if (!adminChatBound) {
    adminChatBound = true;
    document.getElementById('refreshAdminChatBtn')?.addEventListener('click', async () => {
      await loadAdminChatPanel();
      if (adminSelectedChatCompanyId) await renderAdminChat(adminSelectedChatCompanyId);
    });
    document.getElementById('adminChatReplyForm')?.addEventListener('submit', handleAdminChatReply);
  }

  await renderAdminChat(adminSelectedChatCompanyId);
}

async function renderAdminChat(companyId) {
  const host = document.getElementById('adminChatHistory');
  const title = document.getElementById('adminChatSelectedTitle');
  if (!host) return;

  syncAdminChatReplyForm(companyId);

  if (!companyId) {
    if (title) title.textContent = 'Sélectionnez une société';
    host.innerHTML = '<p class="empty-state">Choisissez une société dans la liste à gauche.</p>';
    return;
  }

  let profiles = [];
  let messages = [];
  try {
    profiles = getChatEligibleProfiles(await fetchAllProfiles());
    messages = await fetchChatMessages(companyId);
  } catch (err) {
    host.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
    return;
  }

  const profile = profiles.find((item) => item.id === companyId);
  if (title) {
    title.textContent = profile ? profileLabel(profile) : 'Société';
  }

  if (!messages.length) {
    host.innerHTML = '<p class="empty-state">Aucun message avec cette société.</p>';
    return;
  }

  host.innerHTML = messages.map((msg) => `
    <article class="chat-message ${msg.author_role === 'client' ? 'from-client' : 'from-admin'} ${msg.status === 'pending' && msg.author_role === 'client' ? 'needs-moderation' : ''}">
      <div class="chat-meta">
        <strong>${msg.author_role === 'client' ? escapeHtml(profileLabel(msg.company)) : 'Administration'}</strong>
        <span>${formatDateTime(msg.created_at)}</span>
        <span class="chat-status ${msg.status}">${chatStatusLabel(msg.status)}</span>
      </div>
      <p>${escapeHtml(msg.message)}</p>
      ${renderChatModerationActions(msg)}
    </article>
  `).join('');

  const firstPending = host.querySelector('.chat-message.needs-moderation');
  if (firstPending) {
    firstPending.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    host.scrollTop = host.scrollHeight;
  }
}

async function handleAdminChatReply(e) {
  e.preventDefault();
  const note = document.getElementById('adminChatNote');
  const companyId = adminSelectedChatCompanyId;
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
    await loadAdminChatPanel();
  } catch (err) {
    showAlert(note, err.message);
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
