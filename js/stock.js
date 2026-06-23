/**
 * Utilitaires stock HB Commerce — dépôt, alertes, achats fournisseur
 */

function formatRestockDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getProductStockQuantity(product) {
  if (!product) return 0;
  if (typeof product.stock_quantity === 'number') return Math.max(0, product.stock_quantity);
  if (typeof product.stock_available === 'number') return Math.max(0, product.stock_available);
  return 0;
}

function getProductMinStockAlert(product) {
  const min = Number(product?.min_stock_alert);
  return Number.isFinite(min) && min >= 0 ? min : 10;
}

function isLowStock(product) {
  const qty = getProductStockQuantity(product);
  const min = getProductMinStockAlert(product);
  return qty > 0 && qty <= min;
}

function getStockStatus(product) {
  const available = getProductStockQuantity(product);
  const min = getProductMinStockAlert(product);
  const restockDate = product?.next_restock_date || product?.estimated_restock_date;
  const restockLabel = restockDate ? formatRestockDate(restockDate) : null;

  if (available <= 0) {
    const detail = restockLabel
      ? `Zero stock — réapprovisionnement estimé le ${restockLabel}`
      : 'Zero stock — réapprovisionnement en cours';
    return {
      label: 'Zero stock',
      detail,
      tone: 'out-of-stock',
      low: true,
      zero: true
    };
  }

  if (available <= min) {
    return {
      label: 'Stock bas',
      detail: `Plus que ${available} unité${available > 1 ? 's' : ''} — pensez à racheter (seuil ${min})`,
      tone: 'low-stock',
      low: true,
      zero: false
    };
  }

  return {
    label: 'En stock',
    detail: `${available} unité${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''}`,
    tone: 'in-stock',
    low: false,
    zero: false
  };
}

function renderStockBadge(product) {
  const status = getStockStatus(product);
  const available = getProductStockQuantity(product);
  const cls = `stock-badge stock-badge--${status.tone}`;
  const text = status.zero ? 'Zero stock' : `${available} en stock`;
  return `
    <span class="${cls}" title="${escapeHtml(status.detail)}">
      ${escapeHtml(text)}
    </span>
  `;
}

function renderAdminStockCell(product) {
  const available = getProductStockQuantity(product);
  const min = getProductMinStockAlert(product);
  const status = getStockStatus(product);
  const cls = `stock-admin-cell stock-admin-cell--${status.tone}`;
  return `
    <div class="${cls}">
      <strong>${available}</strong>
      <span>seuil ${min}</span>
      ${status.low ? `<em class="stock-alert-msg">${status.zero ? 'Zero stock' : 'Stock bas'}</em>` : ''}
    </div>
  `;
}

function renderZeroStockBanner(product) {
  const status = getStockStatus(product);
  if (!status.zero) return '';
  return `<p class="zero-stock-msg" role="alert">${escapeHtml(status.detail)}</p>`;
}

async function checkCartStock(cartItems) {
  const sb = getSupabase();
  if (!sb || !cartItems?.length) return { ok: true, issues: [] };

  const payload = cartItems.map((item) => ({
    slug: item.slug,
    quantity: item.quantity
  }));

  const { data, error } = await sb.rpc('check_order_stock', { p_items: payload });
  if (error) {
    console.warn('check_order_stock:', error.message);
    return { ok: true, issues: [] };
  }

  const issues = (data || []).filter((row) => !row.ok);
  return { ok: !issues.length, issues };
}

async function deductStockForOrder(order, items, userId) {
  const sb = getSupabase();
  if (!sb || !items?.length) return;

  for (const item of items) {
    const slug = item.slug;
    if (!slug) continue;
    const { error } = await sb.rpc('deduct_product_stock', {
      p_slug: slug,
      p_qty: item.quantity,
      p_order_id: order?.id || null,
      p_user_id: userId || null
    });
    if (error) throw error;
  }
}

async function receiveProductStock({ productSlug, quantity, notes, supplierOrderId = null }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const session = await getSession();
  const { data, error } = await sb.rpc('receive_product_stock', {
    p_slug: productSlug,
    p_qty: quantity,
    p_notes: notes || null,
    p_user_id: session?.user?.id || null,
    p_supplier_order_id: supplierOrderId
  });
  if (error) throw error;
  return data;
}

async function receiveSupplierOrderAtDepot(orderId) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.rpc('receive_supplier_order_at_depot', { p_order_id: orderId });
  if (error) throw error;
  return data;
}

async function fetchLowStockProducts() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('low_stock_products')
    .select('*')
    .order('stock_quantity', { ascending: true });
  if (error) {
    console.warn('low_stock_products:', error.message);
    return [];
  }
  return data || [];
}

async function fetchPendingRestockMap(slugs = null) {
  const sb = getSupabase();
  if (!sb) return {};
  let query = sb.from('pending_restock_orders').select('*');
  if (slugs?.length) query = query.in('product_slug', slugs);
  const { data, error } = await query;
  if (error) {
    console.warn('pending_restock_orders:', error.message);
    return {};
  }
  return Object.fromEntries((data || []).map((row) => [row.product_slug, row]));
}

async function fetchStockAlerts(status = 'open') {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from('stock_alerts').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) {
    console.warn('stock_alerts:', error.message);
    return [];
  }
  return data || [];
}

async function closeStockAlert(alertId) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const session = await getSession();
  const { data, error } = await sb
    .from('stock_alerts')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: session?.user?.id || null
    })
    .eq('id', alertId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchRecentStockMovements(limit = 30) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('stock_movements:', error.message);
    return [];
  }
  return data || [];
}

const SUPPLIER_ORDER_STATUS_LABELS = {
  requested: 'Demandée',
  accepted: 'Acceptée',
  in_preparation: 'En préparation',
  shipped: 'En transit',
  received: 'Reçue au dépôt',
  cancelled: 'Annulée'
};

window.formatRestockDate = formatRestockDate;
window.getProductStockQuantity = getProductStockQuantity;
window.getProductMinStockAlert = getProductMinStockAlert;
window.isLowStock = isLowStock;
window.getStockStatus = getStockStatus;
window.renderStockBadge = renderStockBadge;
window.renderAdminStockCell = renderAdminStockCell;
window.renderZeroStockBanner = renderZeroStockBanner;
window.checkCartStock = checkCartStock;
window.deductStockForOrder = deductStockForOrder;
window.receiveProductStock = receiveProductStock;
window.receiveSupplierOrderAtDepot = receiveSupplierOrderAtDepot;
window.fetchLowStockProducts = fetchLowStockProducts;
window.fetchPendingRestockMap = fetchPendingRestockMap;
window.fetchStockAlerts = fetchStockAlerts;
window.closeStockAlert = closeStockAlert;
window.fetchRecentStockMovements = fetchRecentStockMovements;
window.SUPPLIER_ORDER_STATUS_LABELS = SUPPLIER_ORDER_STATUS_LABELS;
