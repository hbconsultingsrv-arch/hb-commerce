/**
 * Stock — casse, pertes et incidents (dépenses + ajustement stock optionnel)
 */

const STOCK_INCIDENT_TYPES = {
  casse: 'Casse',
  perte: 'Perte',
  dommage: 'Dommage',
  stock: 'Incident stock',
  autre: 'Autre incident'
};

const STOCK_INCIDENT_TYPE_KEYS = ['casse', 'perte', 'dommage', 'stock', 'autre'];

function isStockIncidentExpense(expense) {
  return STOCK_INCIDENT_TYPE_KEYS.includes(expense?.expense_type);
}

async function loadStockIncidentsTable() {
  const body = document.getElementById('stockIncidentsBody');
  if (!body || typeof fetchBusinessExpenses !== 'function') return;

  const expenses = (await fetchBusinessExpenses()).filter(isStockIncidentExpense);
  if (!expenses.length) {
    body.innerHTML = '<tr><td colspan="7">Aucun incident enregistré.</td></tr>';
    return;
  }

  body.innerHTML = expenses.map((expense) => `
    <tr>
      <td>${formatDate(expense.expense_date)}</td>
      <td><span class="stock-incident-badge stock-incident-badge--${escapeHtml(expense.expense_type)}">${escapeHtml(STOCK_INCIDENT_TYPES[expense.expense_type] || expense.expense_type)}</span></td>
      <td>${escapeHtml(expense.label || '—')}</td>
      <td><strong class="analytics-amount analytics-amount--expense">−${formatPrice(expense.amount)}</strong></td>
      <td>${escapeHtml(expense.notes || '—')}</td>
      <td>${escapeHtml(expense.created_at ? formatDate(expense.created_at) : '—')}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-dark" data-delete-stock-incident="${expense.id}" title="Supprimer">×</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-delete-stock-incident]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cet incident ?')) return;
      try {
        await deleteBusinessExpense(btn.dataset.deleteStockIncident);
        await loadStockIncidentsTable();
        if (typeof loadAnalyticsData === 'function') {
          await loadAnalyticsData();
          if (typeof refreshAnalyticsPanel === 'function') refreshAnalyticsPanel();
        }
      } catch (err) {
        showAlert(document.getElementById('stockIncidentNote'), err.message);
      }
    });
  });
}

function openStockIncidentModal() {
  const form = document.getElementById('stockIncidentForm');
  form?.reset();
  const dateInput = form?.elements.expense_date;
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
  showAlert(document.getElementById('stockIncidentNote'), '');
  openAppModal('stockIncidentModal');
}

async function handleStockIncidentSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const note = document.getElementById('stockIncidentNote');
  const expenseType = form.elements.expense_type.value;
  const label = form.elements.label.value.trim();
  const amount = parseFloat(form.elements.amount.value);
  const expenseDate = form.elements.expense_date.value;
  const details = form.elements.notes.value.trim() || null;
  const productName = form.elements.product_name?.value?.trim();
  const quantity = parseInt(form.elements.quantity?.value, 10);

  if (!label || !Number.isFinite(amount) || amount < 0) {
    showAlert(note, 'Libellé et montant valides requis.');
    return;
  }

  try {
    const session = await requireAdmin();
    await createBusinessExpense({
      expense_type: expenseType,
      label,
      amount,
      expense_date: expenseDate,
      notes: details,
      created_by: session?.user?.id || null
    });

    if (productName && quantity > 0) {
      const products = await fetchAllProducts();
      const slug = findProductSlugByInput(productName, products);
      if (!slug) {
        showAlert(note, 'Incident enregistré, mais produit introuvable pour l\'ajustement stock.', 'warning');
      } else {
        const incidentLabel = STOCK_INCIDENT_TYPES[expenseType] || expenseType;
        await adjustProductStockLoss({
          productSlug: slug,
          quantity,
          notes: `${incidentLabel} — ${label}${details ? ` · ${details}` : ''} · ${formatPrice(amount)}`
        });
        if (typeof loadProductsTable === 'function') await loadProductsTable();
        if (typeof loadStockMovementsTable === 'function') await loadStockMovementsTable();
        if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
        if (typeof renderStockAlertsPanel === 'function') await renderStockAlertsPanel();
      }
    }

    closeAppModal('stockIncidentModal');
    await loadStockIncidentsTable();
    if (typeof loadAnalyticsData === 'function') {
      await loadAnalyticsData();
      if (typeof refreshAnalyticsPanel === 'function') refreshAnalyticsPanel();
    }
    showAlert(note, 'Incident enregistré.', 'success');
  } catch (err) {
    showAlert(note, err.message || 'Erreur lors de l\'enregistrement.');
  }
}

function bindStockIncidents() {
  document.getElementById('openStockIncidentModalBtn')?.addEventListener('click', openStockIncidentModal);
  document.getElementById('stockIncidentForm')?.addEventListener('submit', handleStockIncidentSubmit);
}

async function initStockIncidentsPanel() {
  bindStockIncidents();
  await loadStockIncidentsTable();
}

document.addEventListener('DOMContentLoaded', () => {
  bindStockIncidents();
});

window.loadStockIncidentsTable = loadStockIncidentsTable;
window.initStockIncidentsPanel = initStockIncidentsPanel;
window.STOCK_INCIDENT_TYPES = STOCK_INCIDENT_TYPES;
