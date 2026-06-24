/**
 * Suivi de commande — espace client HB Commerce
 */

const TRACKING_STEPS = [
  { key: 'received', label: 'Commande reçue' },
  { key: 'payment', label: 'Paiement confirmé' },
  { key: 'preparing', label: 'Préparation en cours' },
  { key: 'ready', label: 'Commande prête' },
  { key: 'shipped', label: 'Expédiée' },
  { key: 'transit', label: 'En livraison' },
  { key: 'delivered', label: 'Livrée' }
];

const PAYMENT_METHOD_LABELS = {
  virement: 'Virement bancaire',
  stripe: 'Carte bancaire (Stripe)',
  cheque: 'Chèque'
};

const TRACKING_PROGRESS_PCT = [8, 22, 38, 52, 68, 84, 100];

let trackingState = {
  session: null,
  profile: null,
  orders: [],
  selectedId: null,
  pollTimer: null
};

function formatOrderRef(order) {
  const d = new Date(order.created_at);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const short = order.id.slice(0, 8).toUpperCase();
  return `CMD-${year}${month}-${short}`;
}

function getTotalQuantity(order) {
  return (order.order_items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function getProductsSummary(order) {
  return (order.order_items || [])
    .map((i) => `${i.product_name} × ${i.quantity}`)
    .join(', ');
}

function getTrackingPhase(order) {
  if (order.status === 'annulee') return 0;

  const ds = order.delivery_status || 'non_preparee';
  const st = order.status;

  if (ds === 'livree' || st === 'livree' || order.delivered_at) return 7;
  if (ds === 'en_transit') return 5;
  if (ds === 'expediee' || st === 'expediee') return 4;
  if (ds === 'prete') return 3;
  if (ds === 'preparation' || st === 'en_preparation') return 2;
  if (['payee', 'en_preparation', 'expediee', 'livree'].includes(st)) return 2;
  if (st === 'en_attente_paiement' || st === 'validee') return 1;
  if (st === 'en_attente') return 1;
  return 0;
}

function isStepCompleted(order, stepIndex) {
  if (order.status === 'annulee') return stepIndex === 0;
  const phase = getTrackingPhase(order);
  if (phase >= 7) return true;
  return stepIndex < phase;
}

function getProgressPct(order) {
  const phase = getTrackingPhase(order);
  if (order.status === 'annulee') return TRACKING_PROGRESS_PCT[0];
  if (phase >= 7) return 100;
  return TRACKING_PROGRESS_PCT[phase] ?? 10;
}

function getCurrentStatusLabel(order) {
  if (order.status === 'annulee') return 'Commande annulée';

  const phase = getTrackingPhase(order);
  if (phase >= 7) return 'Livrée';
  return TRACKING_STEPS[phase]?.label || ORDER_STATUS_LABELS[order.status] || order.status;
}

function getCurrentStepIndex(order) {
  if (order.status === 'annulee') return -1;
  const phase = getTrackingPhase(order);
  if (phase >= 7) return TRACKING_STEPS.length - 1;
  return phase;
}

function estimateStepDate(order, stepIndex) {
  if (stepIndex === 0) return order.created_at;
  if (stepIndex === 6 && order.delivered_at) return order.delivered_at;

  const created = new Date(order.created_at).getTime();
  const end = order.delivered_at
    ? new Date(order.delivered_at).getTime()
    : new Date(order.updated_at || order.created_at).getTime();
  const ratio = stepIndex / (TRACKING_STEPS.length - 1);
  return new Date(created + (end - created) * ratio).toISOString();
}

function buildOrderEvents(order) {
  if (order.status === 'annulee') {
    return [
      { at: order.created_at, text: 'Commande reçue' },
      { at: order.updated_at || order.created_at, text: 'Commande annulée' }
    ];
  }

  const events = [];
  const stepDescriptions = [
    'Commande reçue et enregistrée',
    'Paiement confirmé',
    'Préparation de la commande commencée',
    'Commande prête pour expédition',
    'Commande expédiée' + (order.carrier ? ` — ${order.carrier}` : ''),
    'Colis en cours de livraison',
    'Commande livrée'
  ];

  const phase = getTrackingPhase(order);
  const eventCount = phase >= 7 ? TRACKING_STEPS.length : phase;

  for (let i = 0; i < eventCount; i++) {
    events.push({
      at: estimateStepDate(order, i),
      text: stepDescriptions[i]
    });
  }

  if (order.tracking_number && isStepCompleted(order, 4)) {
    const last = events[events.length - 1];
    if (last && last.text.startsWith('Commande expédiée')) {
      last.text += ` — N° suivi : ${order.tracking_number}`;
    }
  }

  if (['validee', 'en_attente_paiement'].includes(order.status) && events.length === 1) {
    events.push({
      at: order.updated_at || order.created_at,
      text: order.status === 'en_attente_paiement'
        ? 'En attente de confirmation de paiement'
        : 'Commande validée par HB Commerce'
    });
  }

  if (order.status === 'en_attente' && events.length === 1) {
    events.push({
      at: order.updated_at || order.created_at,
      text: 'Commande en cours de validation'
    });
  }

  return events.sort((a, b) => new Date(a.at) - new Date(b.at));
}

function renderTimeline(order) {
  const phase = getTrackingPhase(order);
  const cancelled = order.status === 'annulee';
  const allDone = phase >= 7;
  const current = getCurrentStepIndex(order);
  const progressWidth = cancelled ? '0%' : `${getProgressPct(order)}%`;

  const stepsHtml = TRACKING_STEPS.map((step, i) => {
    let cls = 'order-tracking-step';
    const done = isStepCompleted(order, i);
    if (done) cls += ' is-done';
    if (!cancelled && !allDone && i === current) cls += ' is-current';
    if (cancelled && i === 0) cls += ' is-cancelled';
    return `
      <div class="${cls}" role="listitem">
        <div class="order-tracking-step-dot" aria-hidden="true">${done ? '✓' : i + 1}</div>
        <span class="order-tracking-step-label">${escapeHtml(step.label)}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="order-tracking-timeline-progress" style="width:${progressWidth}" aria-hidden="true"></div>
    ${stepsHtml}
  `;
}

function renderDetailInfo(order, profile) {
  const payment = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—';
  const address = order.shipping_address || profile?.address || '—';
  const contact = [
    profile?.full_name,
    profile?.phone,
    profile?.email || trackingState.session?.user?.email
  ].filter(Boolean).join(' · ');

  const trackingLink = order.tracking_url && order.tracking_number
    ? `<a href="${escapeHtml(order.tracking_url)}" target="_blank" rel="noopener">${escapeHtml(order.tracking_number)}</a>`
    : escapeHtml(order.tracking_number || '—');

  const items = [
    { label: 'Statut actuel', value: getCurrentStatusLabel(order) },
    { label: 'Livraison estimée', value: formatDate(order.estimated_delivery_date) },
    { label: 'Mode de paiement', value: payment },
    { label: 'Adresse de livraison', value: escapeHtml(address) },
    { label: 'Contact', value: escapeHtml(contact || '—') },
    { label: 'Transporteur / Suivi', value: `${escapeHtml(order.carrier || '—')} · ${trackingLink}` }
  ];

  return items.map((item) => `
    <dl class="order-tracking-info-item">
      <dt>${item.label}</dt>
      <dd>${item.value}</dd>
    </dl>
  `).join('');
}

function renderOrderCard(order, isActive) {
  const ref = formatOrderRef(order);
  const qty = getTotalQuantity(order);
  const pct = getProgressPct(order);

  return `
    <button type="button" class="order-track-card${isActive ? ' is-active' : ''}" data-order-id="${order.id}" aria-pressed="${isActive}">
      <div class="order-track-card-top">
        <span class="order-track-card-ref">${escapeHtml(ref)}</span>
        <span class="order-track-card-date">${formatDate(order.created_at)}</span>
      </div>
      <p class="order-track-card-products">${escapeHtml(getProductsSummary(order))}</p>
      <div class="order-track-card-footer">
        <span class="order-track-card-total">${formatPrice(order.total)}</span>
        <span class="order-track-card-qty">${qty} unité${qty > 1 ? 's' : ''}</span>
      </div>
      <div class="order-track-card-mini-bar" aria-hidden="true">
        <div class="order-track-card-mini-fill" style="width:${pct}%"></div>
      </div>
    </button>
  `;
}

function renderOrderDetail(order) {
  const ref = formatOrderRef(order);
  const qty = getTotalQuantity(order);
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

  document.getElementById('detailRef').textContent = ref;
  document.getElementById('detailTitle').textContent = `Commande du ${formatDate(order.created_at)}`;
  document.getElementById('detailMeta').textContent =
    `${formatPrice(order.total)} · ${qty} unité${qty > 1 ? 's' : ''} commandée${qty > 1 ? 's' : ''}`;

  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = statusLabel;
  badge.className = `order-status ${order.status}`;

  const productsEl = document.getElementById('detailProducts');
  productsEl.innerHTML = (order.order_items || []).map((item) => `
    <span class="order-tracking-product-chip">
      ${escapeHtml(item.product_name)}
      <strong>× ${item.quantity}</strong>
      ${item.unit ? `<span>${escapeHtml(item.unit)}</span>` : ''}
    </span>
  `).join('');

  document.getElementById('detailTimeline').innerHTML = renderTimeline(order);
  document.getElementById('detailInfo').innerHTML = renderDetailInfo(order, trackingState.profile);

  const events = buildOrderEvents(order);
  document.getElementById('detailEvents').innerHTML = events.map((ev, i) => `
    <li class="order-tracking-event${i === events.length - 1 ? ' is-latest' : ''}">
      <time datetime="${escapeHtml(ev.at)}">${formatDateTime(ev.at)}</time>
      <p>${escapeHtml(ev.text)}</p>
    </li>
  `).join('');
}

function selectOrder(orderId) {
  trackingState.selectedId = orderId;
  const order = trackingState.orders.find((o) => o.id === orderId);
  if (!order) return;

  document.querySelectorAll('.order-track-card').forEach((card) => {
    const active = card.dataset.orderId === orderId;
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-pressed', active);
  });

  const detail = document.getElementById('orderDetail');
  const placeholder = document.getElementById('orderPlaceholder');
  detail.hidden = false;
  if (placeholder) placeholder.hidden = true;

  renderOrderDetail(order);

  if (window.matchMedia('(max-width: 960px)').matches) {
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderOrdersList() {
  const listEl = document.getElementById('ordersList');
  const countEl = document.getElementById('ordersCount');
  if (!listEl) return;

  countEl.textContent = String(trackingState.orders.length);

  if (!trackingState.orders.length) return;

  const selected = trackingState.selectedId || trackingState.orders[0].id;
  if (!trackingState.selectedId) trackingState.selectedId = selected;

  listEl.innerHTML = trackingState.orders
    .map((order) => renderOrderCard(order, order.id === selected))
    .join('');

  listEl.querySelectorAll('.order-track-card').forEach((card) => {
    card.addEventListener('click', () => selectOrder(card.dataset.orderId));
  });

  selectOrder(selected);
}

function showTrackingView(state) {
  const loading = document.getElementById('trackingLoading');
  const empty = document.getElementById('trackingEmpty');
  const layout = document.getElementById('trackingLayout');

  loading.hidden = true;

  if (state === 'empty') {
    empty.hidden = false;
    layout.hidden = true;
  } else {
    empty.hidden = true;
    layout.hidden = false;
    renderOrdersList();
  }
}

async function loadOrders(showRefresh = false) {
  const refreshBtn = document.getElementById('refreshOrdersBtn');
  if (showRefresh && refreshBtn) refreshBtn.classList.add('is-loading');

  try {
    const orders = await fetchUserOrders(trackingState.session.user.id);
    const prevSelected = trackingState.selectedId;
    trackingState.orders = orders;

    if (!orders.length) {
      showTrackingView('empty');
    } else {
      if (prevSelected && orders.some((o) => o.id === prevSelected)) {
        trackingState.selectedId = prevSelected;
      } else {
        trackingState.selectedId = orders[0].id;
      }
      showTrackingView('list');
    }
  } catch (err) {
    const loading = document.getElementById('trackingLoading');
    if (loading) {
      loading.innerHTML = `<p class="form-note error">${escapeHtml(err.message || 'Impossible de charger les commandes.')}</p>`;
    }
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('is-loading');
  }
}

function startPolling() {
  if (trackingState.pollTimer) clearInterval(trackingState.pollTimer);
  trackingState.pollTimer = setInterval(() => loadOrders(false), 30000);
}

async function initOrderTracking() {
  const session = await requireAuth();
  if (!session) return;

  trackingState.session = session;
  trackingState.profile = await getProfile(session.user.id);
  await refreshPriceVisibility(session);

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  document.getElementById('refreshOrdersBtn')?.addEventListener('click', () => loadOrders(true));

  await loadOrders(false);
  startPolling();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadOrders(false);
  });
}

document.addEventListener('DOMContentLoaded', initOrderTracking);
