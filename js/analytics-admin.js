/**
 * Analyses financières — gains, dépenses auto + manuelles, résultat net
 */

const EXPENSE_TYPE_LABELS = {
  livraison: 'Livraison',
  stock: 'Demande stock',
  logistique: 'Logistique',
  fournisseur: 'Fournisseur',
  autre: 'Autre'
};

const ANALYTICS_PERIOD_DAYS = {
  month: 30,
  quarter: 90,
  year: 365,
  all: null
};

function getSupplierOrderAmount(order) {
  if (order.total_price != null && !Number.isNaN(parseFloat(order.total_price))) {
    return parseFloat(order.total_price);
  }
  if (order.unit_price != null && !Number.isNaN(parseFloat(order.unit_price))) {
    return parseFloat(order.unit_price) * (order.quantity || 0);
  }
  const notes = order.notes || '';
  const totalMatch = notes.match(/Total:\s*([\d.,]+)/i);
  if (totalMatch) return parseFloat(totalMatch[1].replace(',', '.'));
  const unitMatch = notes.match(/Prix unitaire:\s*([\d.,]+)/i);
  if (unitMatch) return parseFloat(unitMatch[1].replace(',', '.')) * (order.quantity || 0);
  return 0;
}

function isOrderCountedAsRevenue(status) {
  return status !== 'annulee';
}

function isSupplierOrderCountedAsExpense(status) {
  return status !== 'cancelled';
}

function parseAnalyticsDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinPeriod(dateValue, periodKey) {
  const days = ANALYTICS_PERIOD_DAYS[periodKey];
  if (days == null) return true;
  const d = parseAnalyticsDate(dateValue);
  if (!d) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return d >= cutoff;
}

function buildAnalyticsLedger({ orders = [], supplierOrders = [], manualExpenses = [], period = 'all' }) {
  const entries = [];

  orders.forEach((order) => {
    if (!isOrderCountedAsRevenue(order.status)) return;
    const date = order.created_at;
    if (!isWithinPeriod(date, period)) return;
    const amount = parseFloat(order.total) || 0;
    const items = (order.order_items || []).map((i) => i.product_name).slice(0, 2).join(', ');
    entries.push({
      id: `order-${order.id}`,
      kind: 'revenue',
      date,
      typeLabel: 'Vente client',
      label: `Commande #${order.id.slice(0, 8)}${items ? ` — ${items}` : ''}`,
      amount,
      source: 'auto',
      status: order.status,
      refId: order.id
    });
  });

  supplierOrders.forEach((order) => {
    if (!isSupplierOrderCountedAsExpense(order.status)) return;
    const date = order.order_date || order.created_at;
    if (!isWithinPeriod(date, period)) return;
    const amount = getSupplierOrderAmount(order);
    if (amount <= 0) return;
    entries.push({
      id: `supplier-${order.id}`,
      kind: 'expense',
      date,
      typeLabel: 'Achat stock',
      label: `${order.product_slug || 'Produit'} × ${order.quantity || 0}`,
      amount,
      source: 'auto',
      status: order.status,
      refId: order.id
    });
  });

  manualExpenses.forEach((exp) => {
    if (!isWithinPeriod(exp.expense_date, period)) return;
    entries.push({
      id: `manual-${exp.id}`,
      kind: 'expense',
      date: exp.expense_date,
      typeLabel: EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type,
      label: exp.label,
      amount: parseFloat(exp.amount) || 0,
      source: 'manual',
      status: null,
      refId: exp.id,
      notes: exp.notes
    });
  });

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  const revenue = entries.filter((e) => e.kind === 'revenue').reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const autoStock = supplierOrders
    .filter((o) => isSupplierOrderCountedAsExpense(o.status) && isWithinPeriod(o.order_date || o.created_at, period))
    .reduce((s, o) => s + getSupplierOrderAmount(o), 0);
  const manualTotal = manualExpenses
    .filter((e) => isWithinPeriod(e.expense_date, period))
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const cancelledOrders = orders.filter((o) => o.status === 'annulee' && isWithinPeriod(o.created_at, period)).length;
  const cancelledPurchases = supplierOrders.filter((o) => o.status === 'cancelled' && isWithinPeriod(o.order_date || o.created_at, period)).length;

  return {
    entries,
    revenue,
    expenses,
    net: revenue - expenses,
    autoStock,
    manualTotal,
    cancelledOrders,
    cancelledPurchases
  };
}

function renderAnalyticsKpis(snapshot) {
  const netClass = snapshot.net >= 0 ? 'analytics-kpi--gain' : 'analytics-kpi--loss';
  const netLabel = snapshot.net >= 0 ? 'Bénéfice' : 'Perte';
  return `
    <div class="analytics-kpis">
      <article class="analytics-kpi analytics-kpi--revenue">
        <span class="analytics-kpi-label">Gains (ventes)</span>
        <strong class="analytics-kpi-value">${formatPrice(snapshot.revenue)}</strong>
        <span class="analytics-kpi-hint">Commandes clients (hors annulées)</span>
      </article>
      <article class="analytics-kpi analytics-kpi--expense">
        <span class="analytics-kpi-label">Dépenses</span>
        <strong class="analytics-kpi-value">${formatPrice(snapshot.expenses)}</strong>
        <span class="analytics-kpi-hint">Stock auto ${formatPrice(snapshot.autoStock)} · Manuel ${formatPrice(snapshot.manualTotal)}</span>
      </article>
      <article class="analytics-kpi ${netClass}">
        <span class="analytics-kpi-label">${netLabel} net</span>
        <strong class="analytics-kpi-value">${formatPrice(Math.abs(snapshot.net))}</strong>
        <span class="analytics-kpi-hint">${snapshot.net >= 0 ? 'Gains − dépenses' : 'Dépenses − gains'}</span>
      </article>
    </div>
  `;
}

function renderAnalyticsTable(entries) {
  if (!entries.length) {
    return '<p class="empty-state">Aucune opération sur cette période.</p>';
  }
  return `
    <div class="table-wrap">
      <table class="requests-table analytics-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Libellé</th>
            <th>Source</th>
            <th class="analytics-col-amount">Montant</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry) => `
            <tr class="analytics-row analytics-row--${entry.kind}">
              <td>${formatDate(entry.date)}</td>
              <td><span class="analytics-type-badge analytics-type-badge--${entry.kind}">${escapeHtml(entry.typeLabel)}</span></td>
              <td>${escapeHtml(entry.label)}</td>
              <td><span class="analytics-source analytics-source--${entry.source}">${entry.source === 'auto' ? 'Automatique' : 'Manuel'}</span></td>
              <td class="analytics-col-amount">
                <strong class="analytics-amount analytics-amount--${entry.kind}">
                  ${entry.kind === 'revenue' ? '+' : '−'}${formatPrice(entry.amount)}
                </strong>
              </td>
              <td class="analytics-actions">
                ${entry.source === 'manual'
                  ? `<button type="button" class="btn btn-sm btn-outline-dark" data-delete-expense="${entry.refId}" title="Supprimer">×</button>`
                  : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

let analyticsCache = { orders: [], supplierOrders: [], manualExpenses: [] };
let analyticsInitialized = false;

async function loadAnalyticsData() {
  const [orders, supplierOrders, manualExpenses] = await Promise.all([
    fetchAllOrders(),
    fetchSupplierOrders(),
    fetchBusinessExpenses()
  ]);
  analyticsCache = { orders, supplierOrders, manualExpenses };
  return analyticsCache;
}

function refreshAnalyticsPanel() {
  const kpiHost = document.getElementById('analyticsKpis');
  const tableHost = document.getElementById('analyticsTableHost');
  const note = document.getElementById('analyticsNote');
  const periodSelect = document.getElementById('analyticsPeriod');
  if (!kpiHost || !tableHost) return;

  const period = periodSelect?.value || 'all';
  const snapshot = buildAnalyticsLedger({ ...analyticsCache, period });

  kpiHost.innerHTML = renderAnalyticsKpis(snapshot);
  tableHost.innerHTML = renderAnalyticsTable(snapshot.entries);

  if (note) {
    const parts = [];
    if (snapshot.cancelledOrders) parts.push(`${snapshot.cancelledOrders} commande(s) annulée(s) exclue(s)`);
    if (snapshot.cancelledPurchases) parts.push(`${snapshot.cancelledPurchases} achat(s) stock annulé(s) exclu(s)`);
    note.textContent = parts.length
      ? `${parts.join(' · ')}. Les montants se recalculent automatiquement.`
      : 'Les ventes clients et achats stock sont détectés automatiquement. Ajoutez les dépenses manuelles (livraison, etc.) avec le bouton +.';
  }

  tableHost.querySelectorAll('[data-delete-expense]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette dépense manuelle ?')) return;
      try {
        await deleteBusinessExpense(btn.dataset.deleteExpense);
        await loadAnalyticsData();
        refreshAnalyticsPanel();
      } catch (err) {
        showAlert(document.getElementById('analyticsExpenseNote'), err.message);
      }
    });
  });
}

async function initAnalyticsAdminPanel() {
  const panel = document.getElementById('panel-analyses');
  if (!panel) return;

  if (!analyticsInitialized) {
    analyticsInitialized = true;

    document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', async () => {
      await loadAnalyticsData();
      refreshAnalyticsPanel();
    });

    document.getElementById('analyticsPeriod')?.addEventListener('change', refreshAnalyticsPanel);

    document.getElementById('openExpenseModalBtn')?.addEventListener('click', () => {
      const form = document.getElementById('analyticsExpenseForm');
      form?.reset();
      const dateInput = form?.elements.expense_date;
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
      showAlert(document.getElementById('analyticsExpenseNote'), '');
      openAppModal('analyticsExpenseModal');
    });

    document.getElementById('analyticsExpenseForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const note = document.getElementById('analyticsExpenseNote');
      try {
        const session = await requireAdmin();
        await createBusinessExpense({
          expense_type: form.elements.expense_type.value,
          label: form.elements.label.value.trim(),
          amount: parseFloat(form.elements.amount.value),
          expense_date: form.elements.expense_date.value,
          notes: form.elements.notes.value.trim() || null,
          created_by: session?.user?.id || null
        });
        closeAppModal('analyticsExpenseModal');
        await loadAnalyticsData();
        refreshAnalyticsPanel();
        showAlert(document.getElementById('analyticsPanelNote'), 'Dépense enregistrée.', 'success');
      } catch (err) {
        showAlert(note, err.message);
      }
    });
  }

  await loadAnalyticsData();
  refreshAnalyticsPanel();
}

window.initAnalyticsAdminPanel = initAnalyticsAdminPanel;
window.buildAnalyticsLedger = buildAnalyticsLedger;
window.refreshAnalyticsPanel = refreshAnalyticsPanel;
window.loadAnalyticsData = loadAnalyticsData;
