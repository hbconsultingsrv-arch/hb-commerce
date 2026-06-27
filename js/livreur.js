/**
 * Espace livreur — HB Commerce
 */

let livreurState = {
  profile: null,
  driverId: null,
  orders: [],
  selectedId: null,
  filter: 'all'
};

function formatOrderRef(order) {
  const d = new Date(order.created_at);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `CMD-${year}${month}-${order.id.slice(0, 8).toUpperCase()}`;
}

function getCustomerLabel(order) {
  const c = order.customer;
  return c?.company || c?.full_name || c?.email || 'Client';
}

function getCustomerAddress(order) {
  const c = order.customer;
  return order.shipping_address || c?.address || 'Adresse non renseignée';
}

function orderBucket(order) {
  const ds = order.delivery_status || 'non_preparee';
  if (ds === 'livree' || order.status === 'livree' || order.delivered_at) return 'done';
  if (ds === 'en_transit') return 'transit';
  return 'pending';
}

function filterOrders(orders) {
  if (livreurState.filter === 'all') return orders;
  return orders.filter((o) => orderBucket(o) === livreurState.filter);
}

function renderKpis(orders) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kpiTotal', orders.length);
  set('kpiPending', orders.filter((o) => orderBucket(o) === 'pending').length);
  set('kpiTransit', orders.filter((o) => orderBucket(o) === 'transit').length);
  set('kpiDone', orders.filter((o) => orderBucket(o) === 'done').length);
}

function renderList() {
  const list = document.getElementById('livreurList');
  if (!list) return;
  const items = filterOrders(livreurState.orders);
  if (!items.length) {
    list.innerHTML = '<p class="form-note">Aucune course pour ce filtre.</p>';
    return;
  }
  list.innerHTML = items.map((order) => {
    const ds = DELIVERY_STATUS_LABELS[order.delivery_status] || order.delivery_status;
    const active = order.id === livreurState.selectedId ? ' is-active' : '';
    return `
      <button type="button" class="livreur-card${active}" data-order-id="${order.id}">
        <span class="livreur-card-ref">${escapeHtml(formatOrderRef(order))}</span>
        <h3>${escapeHtml(getCustomerLabel(order))}</h3>
        <p class="livreur-card-meta">${escapeHtml(ds)} · ${formatDate(order.estimated_delivery_date)}</p>
      </button>`;
  }).join('');

  list.querySelectorAll('[data-order-id]').forEach((btn) => {
    btn.addEventListener('click', () => selectOrder(btn.dataset.orderId));
  });
}

function renderTimeline(order) {
  const host = document.getElementById('detailTimeline');
  if (!host) return;
  const steps = [
    'Prête', 'En route', 'Livrée'
  ];
  const ds = order.delivery_status || 'non_preparee';
  let phase = 0;
  if (ds === 'livree' || order.delivered_at) phase = 3;
  else if (ds === 'en_transit') phase = 2;
  else if (['prete', 'expediee', 'preparation'].includes(ds)) phase = 1;

  host.innerHTML = steps.map((label, i) => {
    const idx = i + 1;
    const done = phase >= idx;
    const current = phase === idx;
    return `
      <div class="order-tracking-step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}" role="listitem">
        <span class="order-tracking-step-dot" aria-hidden="true"></span>
        <span class="order-tracking-step-label">${escapeHtml(label)}</span>
      </div>`;
  }).join('');
}

function selectOrder(orderId) {
  const order = livreurState.orders.find((o) => o.id === orderId);
  if (!order) return;
  livreurState.selectedId = orderId;
  renderList();

  const detail = document.getElementById('livreurDetail');
  if (detail) detail.hidden = false;

  document.getElementById('detailRef').textContent = formatOrderRef(order);
  document.getElementById('detailClient').textContent = getCustomerLabel(order);
  document.getElementById('detailMeta').textContent =
    `Livraison estimée : ${formatDate(order.estimated_delivery_date)} · ${(order.order_items || []).length} article(s)`;
  document.getElementById('detailStatusBadge').textContent =
    DELIVERY_STATUS_LABELS[order.delivery_status] || ORDER_STATUS_LABELS[order.status] || '—';
  document.getElementById('detailAddress').innerHTML =
    `<strong>Adresse</strong><br>${escapeHtml(getCustomerAddress(order))}` +
    (order.customer?.phone ? `<br><strong>Tél.</strong> ${escapeHtml(order.customer.phone)}` : '');

  const products = document.getElementById('detailProducts');
  products.innerHTML = (order.order_items || []).map((i) =>
    `<li>${escapeHtml(i.product_name)} × ${i.quantity}</li>`
  ).join('') || '<li>Aucun détail produit</li>';

  document.getElementById('detailNotes').value = order.delivery_notes || '';
  renderTimeline(order);
  showAlert(document.getElementById('livreurActionNote'), '');
}

async function applyDeliveryUpdate(patch) {
  const note = document.getElementById('livreurActionNote');
  const orderId = livreurState.selectedId;
  if (!orderId) {
    showAlert(note, 'Sélectionnez une course.');
    return;
  }
  const notes = document.getElementById('detailNotes')?.value?.trim();
  try {
    await updateDriverDelivery(orderId, { ...patch, delivery_notes: notes || null });
    showAlert(note, 'Livraison mise à jour.', 'success');
    await loadDeliveries();
    selectOrder(orderId);
  } catch (err) {
    showAlert(note, err.message);
  }
}

async function loadDeliveries() {
  const loading = document.getElementById('livreurLoading');
  const empty = document.getElementById('livreurEmpty');
  const layout = document.getElementById('livreurLayout');
  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  if (layout) layout.hidden = true;

  livreurState.orders = await fetchDriverDeliveries(livreurState.driverId);
  if (loading) loading.hidden = true;

  if (!livreurState.orders.length) {
    if (empty) empty.hidden = false;
    return;
  }

  if (layout) layout.hidden = false;
  renderKpis(livreurState.orders);
  if (!livreurState.selectedId || !livreurState.orders.find((o) => o.id === livreurState.selectedId)) {
    livreurState.selectedId = livreurState.orders[0].id;
  }
  renderList();
  selectOrder(livreurState.selectedId);
}

async function requireDriver() {
  const session = await requireAuth('login-livreur.html');
  if (!session) return null;
  const profile = await getProfile(session.user.id);

  if (isAdminProfile(profile)) {
    showLivreurAdminPreview(profile);
    livreurState.profile = profile;
    livreurState.adminPreview = true;
    return session;
  }

  if (!isDriverProfile(profile)) {
    window.location.href = await getDefaultDashboardUrl(session);
    return null;
  }
  if (!profile.driver_id) {
    const note = document.getElementById('livreurWelcome');
    if (note) note.textContent = 'Compte livreur sans affectation — contactez l\'administration.';
    return null;
  }
  livreurState.profile = profile;
  livreurState.driverId = profile.driver_id;
  livreurState.adminPreview = false;
  const welcome = document.getElementById('livreurWelcome');
  if (welcome) welcome.textContent = `Bonjour ${profile.full_name || profile.email} — vos courses du jour`;
  return session;
}

function showLivreurAdminPreview(profile) {
  const banner = document.getElementById('livreurAdminBanner');
  const adminLink = document.getElementById('livreurAdminLink');
  if (adminLink) adminLink.hidden = false;
  const welcome = document.getElementById('livreurWelcome');
  if (welcome) {
    welcome.textContent = 'Mode administration — connectez-vous avec un compte livreur pour voir les courses assignées.';
  }
  if (banner) {
    banner.hidden = false;
    banner.innerHTML = `
      <p><strong>Aperçu espace livreur</strong> (${escapeHtml(profile.full_name || profile.email)}).
      Pour tester : <a href="login-livreur.html">connexion livreur</a>
      (demo <code>livreur@hbcommerce.demo</code> / <code>Test1234!</code>).
      <a href="admin.html?tab=equipe">Retour Équipe HB</a> ·
      <a href="admin.html?view=agent">Vue agent commercial</a></p>`;
  }
}

function bindLivreurUi() {
  document.querySelectorAll('[data-livreur-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-livreur-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      livreurState.filter = btn.dataset.livreurFilter;
      renderList();
    });
  });

  document.getElementById('refreshDeliveriesBtn')?.addEventListener('click', loadDeliveries);
  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  document.getElementById('btnEnRoute')?.addEventListener('click', () =>
    applyDeliveryUpdate({ delivery_status: 'en_transit' })
  );
  document.getElementById('btnDelivered')?.addEventListener('click', () =>
    applyDeliveryUpdate({ delivery_status: 'livree', delivered_at: new Date().toISOString() })
  );
  document.getElementById('btnIncident')?.addEventListener('click', () =>
    applyDeliveryUpdate({ delivery_status: 'incident' })
  );
}

async function initLivreurPage() {
  bindLivreurUi();
  if (!(await requireDriver())) return;
  if (!livreurState.adminPreview) {
    await loadDeliveries();
    setInterval(loadDeliveries, 60000);
  } else {
    document.getElementById('livreurLoading')?.setAttribute('hidden', '');
    document.getElementById('livreurEmpty')?.removeAttribute('hidden');
  }
}

document.addEventListener('DOMContentLoaded', initLivreurPage);
