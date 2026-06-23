/**
 * Zone alertes stock — en cours / clos (admin & super)
 */

async function renderStockAlertsPanel(hostId = 'stockAlertsPanel') {
  const host = document.getElementById(hostId);
  if (!host || typeof fetchStockAlerts !== 'function') return;

  const [openAlerts, closedAlerts] = await Promise.all([
    fetchStockAlerts('open'),
    fetchStockAlerts('closed')
  ]);

  host.innerHTML = `
    <section class="stock-alerts-panel dashboard-card dashboard-card-wide">
      <div class="stock-alerts-head">
        <h2>Alertes stock</h2>
        <div class="stock-alerts-tabs" role="tablist">
          <button type="button" class="stock-alerts-tab active" data-alerts-tab="open">
            En cours (${openAlerts.length})
          </button>
          <button type="button" class="stock-alerts-tab" data-alerts-tab="closed">
            Clos (${Math.min(closedAlerts.length, 50)}${closedAlerts.length > 50 ? '+' : ''})
          </button>
        </div>
      </div>
      <div class="stock-alerts-body" data-alerts-panel="open">
        ${renderAlertsList(openAlerts, true)}
      </div>
      <div class="stock-alerts-body" data-alerts-panel="closed" hidden>
        ${renderAlertsList(closedAlerts.slice(0, 50), false)}
      </div>
    </section>
  `;

  host.querySelectorAll('[data-alerts-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      host.querySelectorAll('.stock-alerts-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.alertsTab;
      host.querySelectorAll('[data-alerts-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.alertsPanel !== tab;
      });
    });
  });

  host.querySelectorAll('[data-close-alert]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await closeStockAlert(btn.dataset.closeAlert);
        await renderStockAlertsPanel(hostId);
        if (typeof renderStockAlertBanner === 'function') await renderStockAlertBanner();
      } catch (err) {
        alert(err.message || 'Erreur');
      }
    });
  });
}

function renderAlertsList(alerts, showClose) {
  if (!alerts.length) {
    return '<p class="empty-state">Aucune alerte dans cette catégorie.</p>';
  }

  return `
    <div class="table-wrap">
      <table class="requests-table stock-alerts-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Produit</th>
            <th>Type</th>
            <th>Message</th>
            <th>Stock</th>
            ${showClose ? '<th></th>' : '<th>Clôturée</th>'}
          </tr>
        </thead>
        <tbody>
          ${alerts.map((a) => `
            <tr class="alert-row alert-row--${a.alert_type}">
              <td>${formatDateTime(a.created_at)}</td>
              <td><strong>${escapeHtml(a.product_name || a.product_slug)}</strong></td>
              <td><span class="stock-badge stock-badge--${a.alert_type === 'out_of_stock' ? 'out-of-stock' : 'low-stock'}">${a.alert_type === 'out_of_stock' ? 'Rupture' : 'Stock bas'}</span></td>
              <td>${escapeHtml(a.message)}</td>
              <td>${a.stock_quantity} / seuil ${a.min_stock_alert}</td>
              <td>
                ${showClose
                  ? `<button type="button" class="btn btn-sm btn-outline-dark" data-close-alert="${a.id}">Clôturer</button>`
                  : escapeHtml(formatDateTime(a.closed_at) || '—')}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderStockAlertBanner() {
  const host = document.getElementById('stockAlertBanner');
  if (!host || typeof fetchStockAlerts !== 'function') return;

  const open = await fetchStockAlerts('open');
  if (!open.length) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }

  host.hidden = false;
  host.innerHTML = `
    <div class="stock-alert-banner" role="alert">
      <strong>⚠ ${open.length} alerte${open.length > 1 ? 's' : ''} stock en cours</strong>
      <ul>
        ${open.slice(0, 6).map((a) => `<li>${escapeHtml(a.message)}</li>`).join('')}
        ${open.length > 6 ? `<li>… et ${open.length - 6} autre(s) — voir l'onglet Stock</li>` : ''}
      </ul>
    </div>
  `;
}

window.renderStockAlertsPanel = renderStockAlertsPanel;
window.renderStockAlertBanner = renderStockAlertBanner;
