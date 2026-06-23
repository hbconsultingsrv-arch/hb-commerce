/**
 * Achats fournisseur — création, suivi transit, réception dépôt
 */

const IN_TRANSIT_STATUSES = ['requested', 'accepted', 'in_preparation', 'shipped'];

async function uploadPurchaseInvoice(file) {
  if (!file) return { url: null, name: null };
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());

  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `invoices/${Date.now()}-${safeName}`;

  const { error } = await sb.storage.from('purchase-invoices').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) {
    console.warn('Upload facture:', error.message);
    return { url: null, name: file.name, uploadError: error.message };
  }

  const { data } = sb.storage.from('purchase-invoices').getPublicUrl(path);
  return { url: data?.publicUrl || null, name: file.name, path };
}

async function loadSupplierPurchasesTable() {
  const body = document.getElementById('supplierPurchasesBody');
  if (!body || typeof fetchSupplierOrders !== 'function') return;

  const orders = await fetchSupplierOrders();
  const suppliers = typeof adminSuppliers !== 'undefined' && adminSuppliers.length
    ? adminSuppliers
    : await fetchAllSuppliers();
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  if (!orders.length) {
    body.innerHTML = '<tr><td colspan="9">Aucun achat fournisseur enregistré.</td></tr>';
    return;
  }

  body.innerHTML = orders.map((order) => {
    const statusLabel = SUPPLIER_ORDER_STATUS_LABELS[order.status] || order.status;
    const inTransit = IN_TRANSIT_STATUSES.includes(order.status) && !(order.depot_received ?? false);
    const price = order.total_price != null
      ? formatPrice(order.total_price)
      : (order.unit_price != null ? formatPrice(order.unit_price * order.quantity) : '—');
    const invoiceLink = order.invoice_url
      ? `<a href="${escapeHtml(order.invoice_url)}" target="_blank" rel="noopener">Facture</a>`
      : (order.invoice_document_name ? escapeHtml(order.invoice_document_name) : '—');

    return `
      <tr>
        <td>${formatDate(order.order_date || order.created_at)}</td>
        <td>${escapeHtml(supplierMap.get(order.supplier_id)?.name || '—')}</td>
        <td>${escapeHtml(order.product_slug)}</td>
        <td><strong>${order.quantity}</strong></td>
        <td>${price}</td>
        <td>${escapeHtml(formatDate(order.expected_arrival_date) || '—')}</td>
        <td>${invoiceLink}</td>
        <td>
          <span class="purchase-status purchase-status--${order.status}${inTransit ? ' purchase-status--transit' : ''}">
            ${escapeHtml(statusLabel)}
          </span>
          ${order.depot_received ? '<br><small>Stock mis à jour</small>' : ''}
        </td>
        <td>
          ${inTransit
            ? `<button type="button" class="btn btn-sm btn-primary" data-receive-depot="${order.id}">Réception dépôt</button>`
            : (order.depot_received ? '✓ Reçu' : '—')}
        </td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('[data-receive-depot]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Confirmer la réception au dépôt ? Le stock sera augmenté.')) return;
      try {
        btn.disabled = true;
        await receiveSupplierOrderAtDepot(btn.dataset.receiveDepot);
        await loadSupplierPurchasesTable();
        if (typeof loadProductsTable === 'function') await loadProductsTable();
        if (typeof renderStockAlertsPanel === 'function') await renderStockAlertsPanel();
        if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
        if (typeof loadStockMovementsTable === 'function') await loadStockMovementsTable();
      } catch (err) {
        alert(err.message || 'Erreur réception dépôt');
        btn.disabled = false;
      }
    });
  });
}

async function handleSupplierPurchaseSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('supplierPurchaseNote');
  const fd = new FormData(e.target);

  const quantity = parseInt(fd.get('quantity'), 10);
  const unitPrice = parseFloat(fd.get('unit_price'));
  const orderDate = fd.get('order_date') || new Date().toISOString().slice(0, 10);
  const invoiceFile = fd.get('invoice_file');
  const invoiceUrlManual = fd.get('invoice_url') || '';

  if (!quantity || quantity <= 0) {
    showAlert(note, 'Quantité invalide.');
    return;
  }

  try {
    let invoiceUrl = invoiceUrlManual || null;
    let invoiceName = null;

    if (invoiceFile && invoiceFile.size > 0) {
      const uploaded = await uploadPurchaseInvoice(invoiceFile);
      if (uploaded.url) invoiceUrl = uploaded.url;
      invoiceName = uploaded.name;
      if (uploaded.uploadError && !invoiceUrl) {
        showAlert(note, `Facture non uploadée (${uploaded.uploadError}). URL manuelle utilisée si fournie.`, 'warning');
      }
    }

    await createSupplierOrder({
      supplier_id: fd.get('supplier_id'),
      product_slug: fd.get('product_slug'),
      quantity,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : null,
      total_price: Number.isFinite(unitPrice) ? unitPrice * quantity : null,
      order_date: orderDate,
      expected_arrival_date: fd.get('expected_arrival_date') || null,
      invoice_url: invoiceUrl,
      invoice_document_name: invoiceName,
      status: fd.get('initial_status') || 'shipped',
      notes: fd.get('notes') || ''
    });

    e.target.reset();
    showAlert(note, 'Achat fournisseur enregistré. Le stock augmentera à la réception au dépôt.', 'success');
    await loadSupplierPurchasesTable();
  } catch (err) {
    const msg = err.message || '';
    if (/depot_received|schema cache|column/i.test(msg)) {
      showAlert(note, 'Migration Supabase manquante. Exécutez supabase/migration-stock-supplier-orders-patch.sql (ou migration-stock-management.sql) dans le SQL Editor du projet HB Commerce.');
    } else {
      showAlert(note, msg);
    }
  }
}

function bindSupplierPurchases() {
  document.getElementById('supplierPurchaseForm')?.addEventListener('submit', handleSupplierPurchaseSubmit);
  const orderDate = document.querySelector('#supplierPurchaseForm [name="order_date"]');
  if (orderDate && !orderDate.value) {
    orderDate.value = new Date().toISOString().slice(0, 10);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bindSupplierPurchases();
});

window.loadSupplierPurchasesTable = loadSupplierPurchasesTable;
window.handleSupplierPurchaseSubmit = handleSupplierPurchaseSubmit;
