/**
 * Utilitaires admin — références commandes, stock, marges, impressions
 */

const ORDER_PROGRESS_PCT = {
  en_attente: 12,
  validee: 28,
  en_attente_paiement: 35,
  payee: 50,
  en_preparation: 68,
  expediee: 85,
  livree: 100,
  annulee: 0
};

const ADMIN_ORDER_STATUS_SHORT = {
  en_attente: 'En attente',
  validee: 'Confirmée',
  en_attente_paiement: 'Paiement',
  payee: 'Payée',
  en_preparation: 'Préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée'
};

const SUPPLIER_WORKFLOW_STEPS = [
  { key: 'draft', label: 'Brouillon', statuses: [] },
  { key: 'sent', label: 'Envoyée', statuses: ['requested'] },
  { key: 'confirmed', label: 'Confirmée', statuses: ['accepted'] },
  { key: 'prep', label: 'Préparation', statuses: ['in_preparation'] },
  { key: 'shipped', label: 'Expédiée', statuses: ['shipped'] },
  { key: 'received', label: 'Reçue', statuses: ['received'] },
  { key: 'done', label: 'Terminée', statuses: [], depot: true }
];

const CHAT_TICKET_STATUSES = {
  new: 'Nouveau',
  in_progress: 'En cours',
  waiting: 'En attente',
  resolved: 'Résolu',
  closed: 'Fermé'
};

const CHAT_QUICK_REPLIES = [
  'Bonjour, nous avons bien reçu votre message et revenons vers vous rapidement.',
  'Votre commande est en cours de préparation au dépôt.',
  'Le suivi de livraison vous sera transmis sous 24h.',
  'Merci pour votre confiance — HB Commerce.'
];

function formatOrderReference(order, allOrders = []) {
  const d = new Date(order.created_at);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const ym = `${year}-${month}`;
  const sameMonth = allOrders
    .filter((o) => {
      const od = new Date(o.created_at);
      return od.getFullYear() === year && od.getMonth() === d.getMonth();
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const seq = Math.max(1, sameMonth.findIndex((o) => o.id === order.id) + 1);
  return `CMD-${ym}-${String(seq).padStart(5, '0')}`;
}

function getOrderProgressPct(status) {
  return ORDER_PROGRESS_PCT[status] ?? 10;
}

function renderOrderProgress(status) {
  const pct = getOrderProgressPct(status);
  const label = ADMIN_ORDER_STATUS_SHORT[status] || status;
  return `
    <div class="order-progress">
      <span class="order-progress-label">${escapeHtml(label)}</span>
      <div class="order-progress-bar"><div class="order-progress-fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

function getStockPill(product) {
  const qty = product.stock_quantity ?? 0;
  const min = product.min_stock_alert ?? 10;
  if (qty <= 0) return '<span class="stock-pill stock-pill--out">Rupture</span>';
  if (qty <= min) return `<span class="stock-pill stock-pill--low">${qty} — faible</span>`;
  return `<span class="stock-pill stock-pill--ok">${qty} — OK</span>`;
}

function computeProductMargin(salePrice, purchasePrice) {
  if (!Number.isFinite(salePrice) || !Number.isFinite(purchasePrice) || purchasePrice <= 0) return null;
  const margin = salePrice - purchasePrice;
  const pct = (margin / salePrice) * 100;
  return { margin, pct };
}

function aggregateProductSales(orders) {
  const map = new Map();
  orders.forEach((order) => {
    if (order.status === 'annulee') return;
    (order.order_items || []).forEach((item) => {
      const key = item.product_id || item.product_name;
      const prev = map.get(key) || { name: item.product_name, qty: 0, revenue: 0 };
      prev.qty += item.quantity || 0;
      prev.revenue += (item.unit_price || 0) * (item.quantity || 0);
      map.set(key, prev);
    });
  });
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

function buildPurchasePriceMap(supplierOrders) {
  const map = new Map();
  supplierOrders.forEach((order) => {
    if (order.status === 'cancelled') return;
    const unit = order.unit_price != null
      ? parseFloat(order.unit_price)
      : (order.total_price != null && order.quantity ? parseFloat(order.total_price) / order.quantity : null);
    if (!unit || !order.product_slug) return;
    const prev = map.get(order.product_slug);
    if (!prev || new Date(order.created_at) > new Date(prev.date)) {
      map.set(order.product_slug, { price: unit, date: order.created_at });
    }
  });
  return map;
}

function renderPurchaseTimeline(order) {
  const received = order.depot_received ?? false;
  const status = order.status;
  let currentIdx = SUPPLIER_WORKFLOW_STEPS.findIndex((s) => s.statuses.includes(status));
  if (received) currentIdx = SUPPLIER_WORKFLOW_STEPS.length - 1;
  if (currentIdx < 0 && status === 'received') currentIdx = 5;

  return `
    <div class="purchase-timeline">
      ${SUPPLIER_WORKFLOW_STEPS.map((step, i) => {
        let cls = 'purchase-timeline-step';
        if (i < currentIdx || (received && i <= currentIdx)) cls += ' is-done';
        if (i === currentIdx && !received) cls += ' is-current';
        if (received && step.key === 'done') cls += ' is-done is-current';
        return `<span class="${cls}">${step.label}</span>`;
      }).join('')}
    </div>
  `;
}

function getChatTicketStatus(companyId) {
  try {
    const raw = localStorage.getItem('hb_chat_ticket_status');
    const map = raw ? JSON.parse(raw) : {};
    return map[companyId] || 'new';
  } catch {
    return 'new';
  }
}

function setChatTicketStatus(companyId, status) {
  try {
    const raw = localStorage.getItem('hb_chat_ticket_status');
    const map = raw ? JSON.parse(raw) : {};
    map[companyId] = status;
    localStorage.setItem('hb_chat_ticket_status', JSON.stringify(map));
  } catch { /* ignore */ }
}

function printOrderDocument(order, profiles, type = 'invoice') {
  const profile = profiles.find((p) => p.id === order.user_id);
  const ref = formatOrderReference(order, [order]);
  const title = type === 'invoice' ? 'Facture' : 'Bon de livraison';
  const items = (order.order_items || []).map((i) => `
    <tr><td>${escapeHtml(i.product_name)}</td><td>${i.quantity}</td><td>${formatPrice(i.unit_price)}</td><td>${formatPrice(i.unit_price * i.quantity)}</td></tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} ${ref}</title>
  <style>body{font-family:Arial,sans-serif;padding:2rem;color:#1a1f1a}h1{color:#3d5c3a}table{width:100%;border-collapse:collapse;margin:1rem 0}td,th{border:1px solid #ddd;padding:.5rem;text-align:left}th{background:#f4f6f4}</style></head>
  <body><h1>HB Commerce — ${title}</h1><p><strong>${ref}</strong> · ${formatDate(order.created_at)}</p>
  <p><strong>Client :</strong> ${escapeHtml(profile?.company || profile?.full_name || '—')}<br>
  ${escapeHtml(profile?.address || order.shipping_address || '')}</p>
  <table><thead><tr><th>Produit</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
  <p><strong>Total : ${formatPrice(order.total)}</strong></p></body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function duplicateProductPayload(product) {
  return {
    name: `${product.name} (copie)`,
    slug: `${product.slug}-copie-${Date.now().toString(36).slice(-4)}`,
    description: product.description,
    origin: product.origin,
    category: product.category,
    price: product.price,
    unit: product.unit,
    supplier_id: product.supplier_id,
    min_quantity: product.min_quantity,
    stock_quantity: 0,
    min_stock_alert: product.min_stock_alert,
    image_url: product.image_url,
    tag: product.tag,
    sort_order: (product.sort_order || 0) + 1,
    active: false,
    purchase_price: product.purchase_price
  };
}

window.formatOrderReference = formatOrderReference;
window.renderOrderProgress = renderOrderProgress;
window.getStockPill = getStockPill;
window.computeProductMargin = computeProductMargin;
window.aggregateProductSales = aggregateProductSales;
window.buildPurchasePriceMap = buildPurchasePriceMap;
window.renderPurchaseTimeline = renderPurchaseTimeline;
window.getChatTicketStatus = getChatTicketStatus;
window.setChatTicketStatus = setChatTicketStatus;
window.printOrderDocument = printOrderDocument;
window.duplicateProductPayload = duplicateProductPayload;
window.CHAT_QUICK_REPLIES = CHAT_QUICK_REPLIES;
window.CHAT_TICKET_STATUSES = CHAT_TICKET_STATUSES;
window.ADMIN_ORDER_STATUS_SHORT = ADMIN_ORDER_STATUS_SHORT;
