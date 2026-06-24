let editingProductId = null;
let editingSupplierId = null;
let adminSession = null;
let adminProfile = null;
let adminProfiles = [];
var adminSuppliers = [];
let adminSelectedChatCompanyId = null;
let adminChatBound = false;
let adminOrders = [];

let adminProductsCache = [];
let adminProductSalesMap = new Map();
let adminPurchasePriceMap = new Map();
let adminSupplierOrdersCache = [];
let adminCustomerPricesCache = [];

function showAdminTab(tabId) {
  if (!tabId) return;
  document.querySelectorAll('.admin-tab, .admin-nav-item').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.admin-panel').forEach((p) => {
    p.hidden = true;
  });
  const panel = document.getElementById(`panel-${tabId}`);
  if (panel) panel.hidden = false;
  if (typeof updateAdminTopbar === 'function') updateAdminTopbar(tabId);
  if (tabId === 'accueil' && typeof loadAdminDashboard === 'function') {
    loadAdminDashboard();
  }
  if (tabId === 'stock' && typeof initStockAdminPanel === 'function') {
    initStockAdminPanel();
  }
  if (tabId === 'analyses' && typeof initAnalyticsAdminPanel === 'function') {
    initAnalyticsAdminPanel();
  }
  if (tabId === 'construction' && typeof initRoadmapAdminPanel === 'function') {
    initRoadmapAdminPanel();
  }
  if (tabId === 'prix') loadCustomerPricesTable();
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
    document.querySelector('[data-tab="accueil"]')?.setAttribute('hidden', '');
    document.getElementById('panel-produits')?.setAttribute('hidden', '');
    document.getElementById('panel-accueil')?.setAttribute('hidden', '');
    showAdminTab('commandes');
  } else {
    showAdminTab('accueil');
    loadAdminDashboard();
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
  document.getElementById('adminSupplierForm')?.addEventListener('submit', handleAdminSupplierSubmit);
  document.getElementById('cancelAdminSupplierBtn')?.addEventListener('click', resetAdminSupplierForm);
  document.getElementById('refreshSuppliersBtn')?.addEventListener('click', loadSuppliersTable);
  document.getElementById('supplierOrderForm')?.addEventListener('submit', handleSupplierOrderSubmit);
  document.getElementById('refreshPurchasesBtn')?.addEventListener('click', () => {
    if (typeof loadSupplierPurchasesTable === 'function') loadSupplierPurchasesTable();
  });
  if (!commercialAgent && typeof initStockAdminPanel === 'function') {
    initStockAdminPanel();
  }
  document.getElementById('adminClientForm')?.addEventListener('submit', handleAdminClientSubmit);
  document.getElementById('refreshClientsBtn')?.addEventListener('click', loadClientsPanel);
  document.getElementById('adminCustomerPriceForm')?.addEventListener('submit', handleAdminCustomerPriceSubmit);
  bindSectionTabs();
  initSectionTabScopes();
  bindAppModal('trackingModal');
  bindAppModal('supplierDetailModal');
  bindAppModal('analyticsExpenseModal');
  bindAppModal('stockIncidentModal');
  bindAppModal('roadmapItemModal');
  document.getElementById('trackingModalForm')?.addEventListener('submit', handleTrackingModalSubmit);
  populateTrackingStatusSelect();
  populateOrderStatusFilter();
  bindProductFilters();
  bindOrderFilters();
  bindChatEnhancements();
  bindPriceFormPreview();
  initProductImageUpload();
  updateAdminNavBadges();
}

async function loadProductsTable() {
  const products = await fetchAllProducts();
  adminProductsCache = products;
  if (!adminOrders.length) adminOrders = await fetchAllOrders();
  adminSupplierOrdersCache = await fetchSupplierOrders();
  adminProductSalesMap = new Map(aggregateProductSales(adminOrders).map((s) => [s.name, s]));
  adminPurchasePriceMap = buildPurchasePriceMap(adminSupplierOrdersCache);

  const filterSupplier = document.getElementById('productFilterSupplier');
  if (filterSupplier && filterSupplier.options.length <= 1) {
    if (!adminSuppliers.length) adminSuppliers = await fetchAllSuppliers();
    filterSupplier.innerHTML = '<option value="">Tous fournisseurs</option>'
      + adminSuppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  }
  renderProductSupplierSelect();
  if (typeof refreshAdminComboboxes === 'function') await refreshAdminComboboxes();
  renderProductsTableBody();
}

function filterAndSortProducts(products) {
  const q = (document.getElementById('productSearchInput')?.value || '').trim().toLowerCase();
  const supplierId = document.getElementById('productFilterSupplier')?.value || '';
  const status = document.getElementById('productFilterStatus')?.value || '';
  const stockFilter = document.getElementById('productFilterStock')?.value || '';
  const sortBy = document.getElementById('productSortBy')?.value || 'name';

  let list = [...products];
  if (q) {
    list = list.filter((p) =>
      (p.name || '').toLowerCase().includes(q)
      || (p.slug || '').toLowerCase().includes(q)
      || (p.origin || '').toLowerCase().includes(q)
    );
  }
  if (supplierId) list = list.filter((p) => p.supplier_id === supplierId);
  if (status === 'active') list = list.filter((p) => p.active);
  if (status === 'hidden') list = list.filter((p) => !p.active);
  if (stockFilter) {
    list = list.filter((p) => {
      const qty = p.stock_quantity ?? 0;
      const min = p.min_stock_alert ?? 10;
      if (stockFilter === 'out') return qty <= 0;
      if (stockFilter === 'low') return qty > 0 && qty <= min;
      if (stockFilter === 'ok') return qty > min;
      return true;
    });
  }

  list.sort((a, b) => {
    if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'stock-asc') return (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0);
    if (sortBy === 'stock-desc') return (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0);
    if (sortBy === 'sales') {
      const sa = adminProductSalesMap.get(a.name)?.qty || 0;
      const sb = adminProductSalesMap.get(b.name)?.qty || 0;
      return sb - sa;
    }
    return (a.name || '').localeCompare(b.name || '', 'fr');
  });
  return list;
}

function getProductPurchasePrice(product) {
  if (product.purchase_price != null) return parseFloat(product.purchase_price);
  const fromOrder = adminPurchasePriceMap.get(product.slug);
  return fromOrder?.price ?? null;
}

function renderProductsTableBody() {
  const body = document.getElementById('productsBody');
  if (!body) return;
  const supplierMap = new Map(adminSuppliers.map((s) => [s.id, s]));
  const products = filterAndSortProducts(adminProductsCache);

  body.innerHTML = products.length ? products.map((p) => {
    const purchase = getProductPurchasePrice(p);
    const margin = purchase != null ? computeProductMargin(parseFloat(p.price), purchase) : null;
    const sales = adminProductSalesMap.get(p.name);
    return `
    <tr>
      <td><img src="${p.image_url}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px"></td>
      <td><strong>${escapeHtml(p.name)}</strong><br><small class="order-ref">${escapeHtml(p.slug)}</small>${sales ? `<br><small>${sales.qty} vendus</small>` : ''}</td>
      <td>${escapeHtml(supplierMap.get(p.supplier_id)?.name || '—')}</td>
      <td>${purchase != null ? formatPrice(purchase) : '—'}</td>
      <td>${formatPrice(p.price)} / ${p.unit}</td>
      <td>${margin ? `<span class="price-discount-badge">+${formatPrice(margin.margin)} (${margin.pct.toFixed(0)}%)</span>` : '—'}</td>
      <td>${getStockPill(p)}</td>
      <td>${p.active ? '<span class="stock-pill stock-pill--ok">Visible</span>' : '<span class="stock-pill stock-pill--out">Masqué</span>'}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-dark" data-edit="${p.id}">Modifier</button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-duplicate="${p.id}">Dupliquer</button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-delete="${p.id}">Suppr.</button>
        ${p.updated_at ? `<br><small title="Dernière modification">${formatDate(p.updated_at)}</small>` : ''}
      </td>
    </tr>
  `;
  }).join('') : '<tr><td colspan="9">Aucun produit.</td></tr>';

  body.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => editProduct(btn.dataset.edit, adminProductsCache));
  });
  body.querySelectorAll('[data-duplicate]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const p = adminProductsCache.find((x) => x.id === btn.dataset.duplicate);
      if (!p || !confirm('Dupliquer ce produit en brouillon (masqué) ?')) return;
      await createProduct(duplicateProductPayload(p));
      await loadProductsTable();
    });
  });
  body.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce produit ?')) return;
      await deleteProduct(btn.dataset.delete);
      await loadProductsTable();
    });
  });
}

function bindProductFilters() {
  ['productSearchInput', 'productFilterSupplier', 'productFilterStatus', 'productFilterStock', 'productSortBy'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderProductsTableBody);
    document.getElementById(id)?.addEventListener('change', renderProductsTableBody);
  });
  const form = document.getElementById('productForm');
  const preview = () => {
    const el = document.getElementById('productMarginPreview');
    if (!el || !form) return;
    const sale = parseFloat(form.price?.value);
    const purchase = parseFloat(form.purchase_price?.value);
    const m = computeProductMargin(sale, purchase);
    el.textContent = m ? `Marge estimée : ${formatPrice(m.margin)} (${m.pct.toFixed(1)}%)` : '';
  };
  form?.price?.addEventListener('input', preview);
  form?.purchase_price?.addEventListener('input', preview);
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
  if (form.purchase_price) form.purchase_price.value = p.purchase_price ?? '';
  form.unit.value = p.unit || 'litre';
  if (form.supplier_name) {
    const supplier = adminSuppliers.find((s) => s.id === p.supplier_id);
    form.supplier_name.value = supplier?.name || '';
  }
  form.min_quantity.value = p.min_quantity || 1;
  if (form.stock_quantity) form.stock_quantity.value = p.stock_quantity ?? 0;
  if (form.min_stock_alert) form.min_stock_alert.value = p.min_stock_alert ?? 10;
  form.image_url.value = p.image_url || '';
  if (typeof setProductImagePreview === 'function') setProductImagePreview(p.image_url || '');
  if (typeof clearProductImageFileInput === 'function') clearProductImageFileInput();
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
  if (typeof clearProductImageFileInput === 'function') clearProductImageFileInput();
  if (typeof setProductImagePreview === 'function') setProductImagePreview('');
  document.getElementById('productFormTitle').textContent = 'Ajouter un produit';
  document.getElementById('saveProductBtn').textContent = 'Ajouter';
  activateSectionTab('panel-produits', 'liste');
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('productNote');
  const form = e.target;
  const fd = new FormData(form);
  const saveBtn = document.getElementById('saveProductBtn');

  const slug = (fd.get('slug') || slugify(fd.get('name'))).toString().trim();
  let imageUrl = (fd.get('image_url') || '').toString().trim();
  const imageFile = fd.get('product_image');

  if (imageFile instanceof File && imageFile.size > 0) {
    if (typeof uploadProductImage !== 'function') {
      showAlert(note, 'Module upload image indisponible.');
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Upload image…';
    try {
      const uploaded = await uploadProductImage(imageFile, slug);
      if (uploaded.url) {
        imageUrl = uploaded.url;
      } else {
        showAlert(note, uploaded.uploadError
          ? `Image : ${uploaded.uploadError} — exécutez supabase/migration-product-images-storage.sql`
          : 'Échec upload image.', 'error');
        if (!imageUrl) {
          saveBtn.disabled = false;
          saveBtn.textContent = editingProductId ? 'Enregistrer' : 'Ajouter';
          return;
        }
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = editingProductId ? 'Enregistrer' : 'Ajouter';
    }
  }

  if (!imageUrl) {
    imageUrl = typeof DEFAULT_PRODUCT_IMAGE !== 'undefined' ? DEFAULT_PRODUCT_IMAGE : 'images/prenium.PNG';
  }

  const supplierNameRaw = fd.get('supplier_name');
  let supplierId = null;
  if (supplierNameRaw && String(supplierNameRaw).trim()) {
    supplierId = await resolveSupplierIdFromInput(supplierNameRaw, { createIfMissing: true });
  }

  const product = {
    name: fd.get('name'),
    slug,
    description: fd.get('description') || null,
    origin: fd.get('origin') || null,
    category: fd.get('category') || 'alimentaire',
    price: parseFloat(fd.get('price')),
    purchase_price: fd.get('purchase_price') ? parseFloat(fd.get('purchase_price')) : null,
    unit: fd.get('unit') || 'litre',
    supplier_id: supplierId,
    min_quantity: parseInt(fd.get('min_quantity'), 10) || 1,
    stock_quantity: parseInt(fd.get('stock_quantity'), 10) || 0,
    min_stock_alert: parseInt(fd.get('min_stock_alert'), 10) || 10,
    image_url: imageUrl,
    tag: fd.get('tag') || null,
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
  } catch (err) {
    if (err.message?.includes('purchase_price') && product.purchase_price != null) {
      delete product.purchase_price;
      if (editingProductId) await updateProduct(editingProductId, product);
      else await createProduct(product);
      showAlert(note, 'Enregistré (prix d\'achat ignoré — exécutez migration-admin-enhancements.sql).', 'warning');
    } else {
      showAlert(note, err.message);
      return;
    }
  }
  resetProductForm();
  activateSectionTab('panel-produits', 'liste');
  await loadProductsTable();
}

function renderProductSupplierSelect() {
  /* datalists remplies par refreshAdminComboboxes */
}

function renderSupplierOrderSelectors() {
  /* datalists remplies par refreshAdminComboboxes */
}

async function loadSuppliersTable() {
  const body = document.getElementById('suppliersBody');
  try {
    adminSuppliers = await fetchAllSuppliers();
    adminProfiles = adminProfiles.length ? adminProfiles : await fetchAllProfiles();
    const orders = await fetchSupplierOrders();
    adminSupplierOrdersCache = orders;
    const products = await fetchAllProducts();
    renderProductSupplierSelect();
    if (typeof refreshAdminComboboxes === 'function') await refreshAdminComboboxes();
    if (!body) return;

    const statsBySupplier = new Map();
    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const cur = statsBySupplier.get(o.supplier_id) || { total: 0, count: 0 };
      const amt = o.total_price != null ? parseFloat(o.total_price) : (o.unit_price ? parseFloat(o.unit_price) * o.quantity : 0);
      cur.total += amt || 0;
      cur.count += 1;
      statsBySupplier.set(o.supplier_id, cur);
    });

    const productsBySupplier = new Map();
    products.forEach((p) => {
      if (!p.supplier_id) return;
      productsBySupplier.set(p.supplier_id, (productsBySupplier.get(p.supplier_id) || 0) + 1);
    });

    const supplierProfiles = adminProfiles.filter((profile) => profile.role === 'supplier');

    body.innerHTML = supplierProfiles.length ? supplierProfiles.map((profile) => {
      const supplier = adminSuppliers.find((item) => item.id === profile.supplier_id);
      const supplierId = profile.supplier_id || supplier?.id;
      const stats = statsBySupplier.get(supplierId) || { total: 0, count: 0 };
      const prodCount = productsBySupplier.get(supplierId) || 0;
      const isActive = supplier ? supplier.active : true;
      return `
      <tr>
        <td><strong>${escapeHtml(profile.company || supplier?.name || '—')}</strong><br><small>${escapeHtml(profile.address || supplier?.address || '')}</small></td>
        <td>${escapeHtml(profile.full_name || supplier?.contact_name || '—')}<br><small>${escapeHtml(profile.phone || supplier?.phone || '')}</small></td>
        <td>${escapeHtml(profile.vat_number || supplier?.vat_number || '—')}</td>
        <td>${prodCount} produit(s)</td>
        <td><strong>${formatPrice(stats.total)}</strong><br><small>${stats.count} cmd</small></td>
        <td>${isActive ? '<span class="stock-pill stock-pill--ok">Actif</span>' : '<span class="stock-pill stock-pill--out">Inactif</span>'}</td>
        <td>${escapeHtml(profile.email || supplier?.email || '—')}</td>
        <td>
          ${supplierId ? `<button type="button" class="btn btn-sm btn-outline-dark" data-view-supplier="${supplierId}">Fiche</button>` : ''}
          ${supplierId ? `<button type="button" class="btn btn-sm btn-outline-dark" data-edit-supplier="${supplierId}">Modifier</button>` : ''}
        </td>
      </tr>
    `;
    }).join('') : '<tr><td colspan="8">Aucun fournisseur enregistré.</td></tr>';

    body.querySelectorAll('[data-view-supplier]').forEach((btn) => {
      btn.addEventListener('click', () => openSupplierDetail(btn.dataset.viewSupplier, orders, products));
    });
    body.querySelectorAll('[data-edit-supplier]').forEach((btn) => {
      btn.addEventListener('click', () => editSupplier(btn.dataset.editSupplier));
    });
  } catch (err) {
    if (body) body.innerHTML = `<tr><td colspan="8">${escapeHtml(err.message)}</td></tr>`;
  }
}

function openSupplierDetail(supplierId, orders, products) {
  const supplier = adminSuppliers.find((s) => s.id === supplierId);
  if (!supplier) return;
  const supplierOrders = orders.filter((o) => o.supplier_id === supplierId);
  const supplierProducts = products.filter((p) => p.supplier_id === supplierId);
  const total = supplierOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => {
    const amt = o.total_price != null ? parseFloat(o.total_price) : (o.unit_price ? parseFloat(o.unit_price) * o.quantity : 0);
    return s + (amt || 0);
  }, 0);

  document.getElementById('supplierDetailTitle').textContent = supplier.name;
  document.getElementById('supplierDetailBody').innerHTML = `
    <div class="dashboard-grid">
      <div>
        <p><strong>Contact :</strong> ${escapeHtml(supplier.contact_name || '—')} · ${escapeHtml(supplier.email || '')}</p>
        <p><strong>Pays :</strong> ${escapeHtml(supplier.country || '—')} · <strong>TVA :</strong> ${escapeHtml(supplier.vat_number || '—')}</p>
        <p><strong>Total acheté :</strong> ${formatPrice(total)} (${supplierOrders.length} commandes)</p>
        <p><strong>Évaluation interne :</strong> ${supplier.active ? 'Partenaire actif' : 'Inactif'} — délai moyen à calculer selon historique</p>
        <p>${escapeHtml(supplier.notes || '')}</p>
      </div>
      <div>
        <h3>Produits fournis (${supplierProducts.length})</h3>
        <ul>${supplierProducts.map((p) => `<li>${escapeHtml(p.name)}</li>`).join('') || '<li>—</li>'}</ul>
      </div>
    </div>
    <h3 style="margin-top:1rem">Historique commandes</h3>
    <div class="table-wrap"><table class="requests-table"><thead><tr><th>Date</th><th>Produit</th><th>Qté</th><th>Statut</th></tr></thead>
    <tbody>${supplierOrders.slice(0, 15).map((o) => `<tr><td>${formatDate(o.order_date || o.created_at)}</td><td>${escapeHtml(o.product_slug)}</td><td>${o.quantity}</td><td>${escapeHtml(SUPPLIER_ORDER_STATUS_LABELS[o.status] || o.status)}</td></tr>`).join('') || '<tr><td colspan="4">Aucune</td></tr>'}</tbody></table></div>
  `;
  openAppModal('supplierDetailModal');
}

function editSupplier(id) {
  const supplier = adminSuppliers.find((item) => item.id === id);
  const form = document.getElementById('adminSupplierForm');
  const profile = adminProfiles.find((item) => item.supplier_id === id);
  if (!supplier || !form) return;

  editingSupplierId = id;
  form.company.value = profile?.company || supplier.name || '';
  form.full_name.value = profile?.full_name || supplier.contact_name || '';
  form.email.value = profile?.email || supplier.email || '';
  form.phone.value = profile?.phone || supplier.phone || '';
  form.address.value = profile?.address || supplier.address || '';
  form.country.value = supplier.country || '';
  form.siren.value = profile?.siren || supplier.siren || '';
  form.vat_number.value = profile?.vat_number || supplier.vat_number || '';
  form.notes.value = supplier.notes || '';
  if (form.password) {
    form.password.value = '';
    form.password.required = false;
  }
  form.active.checked = supplier.active;
  document.getElementById('adminSupplierFormTitle').textContent = 'Modifier le fournisseur';
  document.getElementById('saveAdminSupplierBtn').textContent = 'Enregistrer';
  activateSectionTab('panel-fournisseurs', 'creer');
}

function resetAdminSupplierForm() {
  editingSupplierId = null;
  const form = document.getElementById('adminSupplierForm');
  if (!form) return;
  form.reset();
  form.active.checked = true;
  if (form.password) form.password.required = true;
  document.getElementById('adminSupplierFormTitle').textContent = 'Créer un fournisseur';
  document.getElementById('saveAdminSupplierBtn').textContent = 'Créer le fournisseur';
  activateSectionTab('panel-fournisseurs', 'liste');
}

async function handleAdminSupplierSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('adminSupplierNote');
  const fd = new FormData(e.target);
  const supplierPayload = {
    name: fd.get('company'),
    contact_name: fd.get('full_name') || '',
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
    if (editingSupplierId) {
      await updateSupplier(editingSupplierId, supplierPayload);
      showAlert(note, 'Fournisseur mis à jour.', 'success');
    } else {
      const supplier = await createSupplier(supplierPayload);
      await createSupplierUser({
        supplierId: supplier.id,
        email: fd.get('email'),
        password: fd.get('password'),
        fullName: fd.get('full_name'),
        phone: fd.get('phone'),
        company: fd.get('company'),
        address: fd.get('address'),
        siren: fd.get('siren'),
        vatNumber: fd.get('vat_number')
      });
      showAlert(note, 'Fournisseur et compte créés.', 'success');
    }
    resetAdminSupplierForm();
    activateSectionTab('panel-fournisseurs', 'liste');
    await loadSuppliersTable();
    await loadProductsTable();
    adminProfiles = await fetchAllProfiles();
  } catch (err) {
    showAlert(note, mapAuthError(err));
  }
}

async function handleSupplierOrderSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('supplierOrderNote');
  const fd = new FormData(e.target);
  try {
    const supplierId = await resolveSupplierIdFromInput(fd.get('supplier_name'), { createIfMissing: true });
    if (!supplierId) {
      showAlert(note, 'Indiquez un fournisseur.');
      return;
    }
    const products = await fetchAllProducts();
    const productSlug = findProductSlugByInput(fd.get('product_name'), products);
    if (!productSlug) {
      showAlert(note, 'Produit introuvable — choisissez dans la liste ou créez-le d\'abord.');
      return;
    }
    await createSupplierOrder({
      supplier_id: supplierId,
      product_slug: productSlug,
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

function populateOrderStatusFilter() {
  const select = document.getElementById('orderFilterStatus');
  if (!select) return;
  select.innerHTML = '<option value="">Tous statuts</option>'
    + Object.entries(ADMIN_ORDER_STATUS_SHORT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
}

function bindOrderFilters() {
  document.getElementById('orderSearchInput')?.addEventListener('input', renderOrdersTableBody);
  document.getElementById('orderFilterStatus')?.addEventListener('change', renderOrdersTableBody);
}

function filterOrders(orders) {
  const q = (document.getElementById('orderSearchInput')?.value || '').trim().toLowerCase();
  const status = document.getElementById('orderFilterStatus')?.value || '';
  return orders.filter((order) => {
    if (status && order.status !== status) return false;
    if (!q) return true;
    const ref = formatOrderReference(order, orders).toLowerCase();
    const profile = adminProfiles.find((p) => p.id === order.user_id);
    const client = (profile?.company || profile?.full_name || '').toLowerCase();
    return ref.includes(q) || client.includes(q) || order.id.toLowerCase().includes(q);
  });
}

function renderOrdersTableBody() {
  const body = document.getElementById('ordersAdminBody');
  if (!body) return;
  const orders = filterOrders(adminOrders);

  body.innerHTML = orders.map((order) => {
    const profile = adminProfiles.find((p) => p.id === order.user_id);
    const ref = formatOrderReference(order, adminOrders);
    const deliveryLabel = DELIVERY_STATUS_LABELS[order.delivery_status || 'non_preparee'] || 'Non préparée';
    return `
      <tr>
        <td>${formatDate(order.created_at)}</td>
        <td><span class="order-ref">${ref}</span></td>
        <td><strong>${escapeHtml(profile?.company || profile?.full_name || '—')}</strong><br><small>${escapeHtml(profile?.full_name || '')}</small></td>
        <td><strong>${formatPrice(order.total)}</strong></td>
        <td>${order.payment_method || '—'}</td>
        <td>
          <select data-order="${order.id}" class="order-status-select">
            ${Object.entries(ORDER_STATUS_LABELS).map(([k, v]) =>
              `<option value="${k}" ${order.status === k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </td>
        <td>${renderOrderProgress(order.status)}</td>
        <td>
          <div class="tracking-cell">
            <span class="tracking-status">${escapeHtml(deliveryLabel)}</span>
            <button type="button" class="btn btn-sm btn-outline-dark" data-open-tracking="${order.id}">Suivi</button>
          </div>
        </td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-dark" data-print-invoice="${order.id}">Facture</button>
          <button type="button" class="btn btn-sm btn-outline-dark" data-print-delivery="${order.id}">BL</button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="9">Aucune commande.</td></tr>';

  body.querySelectorAll('.order-status-select').forEach((select) => {
    select.addEventListener('change', async () => {
      await updateOrderStatus(select.dataset.order, select.value);
      adminOrders = await fetchAllOrders();
      renderOrdersTableBody();
      if (!document.getElementById('panel-analyses')?.hidden && typeof loadAnalyticsData === 'function') {
        await loadAnalyticsData();
        refreshAnalyticsPanel();
      }
    });
  });
  body.querySelectorAll('[data-open-tracking]').forEach((btn) => {
    btn.addEventListener('click', () => openTrackingModal(btn.dataset.openTracking));
  });
  body.querySelectorAll('[data-print-invoice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const order = adminOrders.find((o) => o.id === btn.dataset.printInvoice);
      if (order) printOrderDocument(order, adminProfiles, 'invoice');
    });
  });
  body.querySelectorAll('[data-print-delivery]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const order = adminOrders.find((o) => o.id === btn.dataset.printDelivery);
      if (order) printOrderDocument(order, adminProfiles, 'delivery');
    });
  });
}

async function loadOrdersTable() {
  adminOrders = await fetchAllOrders();
  if (!adminProfiles.length) adminProfiles = await fetchAllProfiles();
  renderOrdersTableBody();
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
  document.getElementById('trackingModalTitle').textContent = `Livraison — ${formatOrderReference(order, adminOrders)}`;
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
    if (!adminOrders.length) adminOrders = await fetchAllOrders();
    const revenueByUser = new Map();
    adminOrders.filter((o) => o.status !== 'annulee').forEach((o) => {
      revenueByUser.set(o.user_id, (revenueByUser.get(o.user_id) || 0) + (parseFloat(o.total) || 0));
    });

    const clients = adminProfiles.filter((p) => ['pending_company', 'client'].includes(p.role));
    const agents = adminProfiles.filter(isCommercialAssignableProfile);
    renderAgentSelect(document.getElementById('adminClientAgentSelect'), agents);
    body.innerHTML = clients.length ? clients.map((profile) => `
      <tr>
        <td><strong>${escapeHtml(profile.company || '—')}</strong><br><small>${escapeHtml(profile.address || '')}</small></td>
        <td>
          ${isCommercialAgentProfile(adminProfile) ? companyRoleLabel(profile.role) : `
            <select data-company-role="${profile.id}">
              ${['pending_company', 'client'].map((role) => `<option value="${role}" ${profile.role === role ? 'selected' : ''}>${companyRoleLabel(role)}</option>`).join('')}
            </select>
          `}
        </td>
        <td>${escapeHtml(profile.full_name || '—')}<br><small>${escapeHtml(profile.phone || '')}</small></td>
        <td>${escapeHtml(profile.vat_number || '—')}</td>
        <td><strong>${formatPrice(revenueByUser.get(profile.id) || 0)}</strong></td>
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
    `).join('') : '<tr><td colspan="7">Aucun client enregistré.</td></tr>';
    body.querySelectorAll('[data-assign-agent]').forEach((select) => {
      select.addEventListener('change', async () => {
        await assignCommercialAgent(select.dataset.assignAgent, select.value);
        await loadClientsPanel();
        await loadAdminChatPanel();
    updateAdminNavBadges();
        await loadAdminPricePanel();
      });
    });
    body.querySelectorAll('[data-company-role]').forEach((select) => {
      select.addEventListener('change', async () => {
        await updateCompanyRole(select.dataset.companyRole, select.value);
        await loadClientsPanel();
        await loadAdminChatPanel();
    updateAdminNavBadges();
        await loadAdminPricePanel();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function updateCompanyRole(profileId, role) {
  if (!['pending_company', 'client'].includes(role)) return;
  await updateProfileAsSuperRoot(profileId, { role, supplier_id: null });
}

function companyRoleLabel(role) {
  return {
    pending_company: 'À affecter',
    client: 'Client'
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
    showAlert(note, 'Client créé.', 'success');
    activateSectionTab('panel-clients', 'liste');
    await loadClientsPanel();
    await loadAdminChatPanel();
    updateAdminNavBadges();
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
  productSelect.innerHTML = products.map((product) => `<option value="${product.slug}" data-catalog-price="${product.price}">${escapeHtml(product.name || product.slug)}</option>`).join('');
  if (!productSelect.dataset.bound) {
    productSelect.dataset.bound = '1';
    productSelect.addEventListener('change', updatePriceDiscountPreview);
    clientSelect.addEventListener('change', updatePriceDiscountPreview);
  }
  await loadCustomerPricesTable();
}

async function loadCustomerPricesTable() {
  const body = document.getElementById('customerPricesBody');
  if (!body) return;
  try {
    adminCustomerPricesCache = await fetchCustomerPrices();
    const profiles = adminProfiles.length ? adminProfiles : await fetchAllProfiles();
    const products = await fetchAllProducts();
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const productMap = new Map(products.map((p) => [p.slug, p]));

    body.innerHTML = adminCustomerPricesCache.length ? adminCustomerPricesCache.map((row) => {
      const catalog = productMap.get(row.product_slug);
      const catalogPrice = catalog?.price ?? 0;
      const discount = catalogPrice > 0 ? ((catalogPrice - row.price) / catalogPrice * 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(profileLabel(profileMap.get(row.profile_id)))}</td>
          <td>${escapeHtml(row.client_category || '—')}</td>
          <td>${escapeHtml(catalog?.name || row.product_slug)}</td>
          <td>${formatPrice(catalogPrice)}</td>
          <td><strong>${formatPrice(row.price)}</strong></td>
          <td>${discount > 0 ? `<span class="price-discount-badge">−${discount.toFixed(1)}%</span>` : '—'}</td>
          <td>${row.min_quantity || 1}</td>
          <td><button type="button" class="btn btn-sm btn-outline-dark" data-delete-price="${row.id}">×</button></td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="8">Aucun tarif personnalisé.</td></tr>';

    body.querySelectorAll('[data-delete-price]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce tarif ?')) return;
        await deleteCustomerPrice(btn.dataset.deletePrice);
        await loadCustomerPricesTable();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="8">${escapeHtml(err.message)}</td></tr>`;
  }
}

function updatePriceDiscountPreview() {
  const form = document.getElementById('adminCustomerPriceForm');
  const preview = document.getElementById('adminPriceDiscountPreview');
  if (!form || !preview) return;
  const productSelect = form.elements.product_slug;
  const opt = productSelect?.selectedOptions?.[0];
  const catalog = parseFloat(opt?.dataset.catalogPrice || 0);
  const custom = parseFloat(form.elements.price?.value || 0);
  if (catalog > 0 && custom > 0) {
    const pct = ((catalog - custom) / catalog * 100);
    preview.textContent = pct > 0 ? `Remise de ${pct.toFixed(1)}% par rapport au catalogue (${formatPrice(catalog)})` : 'Prix égal ou supérieur au catalogue';
  } else preview.textContent = '';
}

function bindPriceFormPreview() {
  document.getElementById('adminCustomerPriceForm')?.elements.price?.addEventListener('input', updatePriceDiscountPreview);
}

async function handleAdminCustomerPriceSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('adminCustomerPriceNote');
  const fd = new FormData(e.target);
  try {
    const payload = {
      profileId: fd.get('profile_id'),
      productSlug: fd.get('product_slug'),
      price: parseFloat(fd.get('price'))
    };
    const sb = getSupabase();
    if (sb) {
      const extra = {
        profile_id: payload.profileId,
        product_slug: payload.productSlug,
        price: payload.price,
        client_category: fd.get('client_category') || null,
        min_quantity: parseInt(fd.get('min_quantity'), 10) || 1
      };
      const { error } = await sb.from('customer_prices').upsert(extra, { onConflict: 'profile_id,product_slug' });
      if (error && error.message?.includes('client_category')) {
        await upsertCustomerPrice(payload);
      } else if (error) throw error;
    } else {
      await upsertCustomerPrice(payload);
    }
    e.target.reset();
    showAlert(note, 'Tarif enregistré.', 'success');
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
    updateAdminNavBadges();
  } catch (err) {
    showAlert(note, err.message || 'Impossible de modérer ce message.');
    button.disabled = false;
  }
}

function bindChatEnhancements() {
  bindAdminChatModeration();
  const quickHost = document.getElementById('adminChatQuickReplies');
  if (quickHost && !quickHost.dataset.bound) {
    quickHost.dataset.bound = '1';
    quickHost.innerHTML = CHAT_QUICK_REPLIES.map((text, i) =>
      `<button type="button" data-quick-reply="${i}">${escapeHtml(text.slice(0, 42))}…</button>`
    ).join('');
    quickHost.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quick-reply]');
      if (!btn) return;
      const textarea = document.querySelector('#adminChatReplyForm textarea');
      if (textarea) textarea.value = CHAT_QUICK_REPLIES[parseInt(btn.dataset.quickReply, 10)] || '';
    });
  }
  document.getElementById('adminChatSearch')?.addEventListener('input', () => loadAdminChatPanel());
  document.getElementById('adminChatTicketFilter')?.addEventListener('change', () => loadAdminChatPanel());
  document.getElementById('adminChatTicketStatus')?.addEventListener('change', (e) => {
    if (adminSelectedChatCompanyId) {
      setChatTicketStatus(adminSelectedChatCompanyId, e.target.value);
    }
  });
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
  const ticketSelect = document.getElementById('adminChatTicketStatus');
  if (ticketSelect) {
    ticketSelect.toggleAttribute('disabled', disabled);
    if (companyId) ticketSelect.value = getChatTicketStatus(companyId);
  }
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

  const chatQ = (document.getElementById('adminChatSearch')?.value || '').trim().toLowerCase();
  const ticketFilter = document.getElementById('adminChatTicketFilter')?.value || '';
  const filtered = summaries.filter(({ profile }) => {
    const label = profileLabel(profile).toLowerCase();
    if (chatQ && !label.includes(chatQ)) return false;
    if (ticketFilter && getChatTicketStatus(profile.id) !== ticketFilter) return false;
    return true;
  });

  if (!filtered.length) {
    listHost.innerHTML = '<p class="empty-state">Aucune conversation trouvée.</p>';
    syncAdminChatReplyForm(null);
    return;
  }

  if (!adminSelectedChatCompanyId || !filtered.some((item) => item.profile.id === adminSelectedChatCompanyId)) {
    adminSelectedChatCompanyId = filtered[0].profile.id;
  }

  listHost.innerHTML = filtered.map(({ profile, pendingCount, lastMessage, lastAt }) => {
    const ticket = getChatTicketStatus(profile.id);
    return `
    <button
      type="button"
      class="chat-thread-item ${profile.id === adminSelectedChatCompanyId ? 'active' : ''}"
      data-chat-company="${profile.id}"
    >
      <span class="chat-thread-title">${escapeHtml(profileLabel(profile))}
        <span class="chat-ticket-status">${CHAT_TICKET_STATUSES[ticket] || ticket}</span>
      </span>
      <span class="chat-thread-preview">${escapeHtml(chatPreview(lastMessage))}</span>
      <span class="chat-thread-meta">
        <span>${lastAt ? escapeHtml(formatDateTime(lastAt)) : '—'}</span>
        ${pendingCount ? `<span class="chat-thread-badge">${pendingCount} non lu</span>` : ''}
      </span>
    </button>
  `;
  }).join('');

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
    updateAdminNavBadges();
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
    updateAdminNavBadges();
  } catch (err) {
    showAlert(note, err.message);
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
