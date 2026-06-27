/**
 * Dashboard accueil admin — KPIs et graphiques
 */

const COMMERCIAL_TAB_TITLES = {
  commandes: { title: 'Mes commandes', sub: 'Commandes de vos clients assignés uniquement' },
  clients: { title: 'Mes clients', sub: 'Portefeuille commercial personnel' },
  prix: { title: 'Prix personnalisés', sub: 'Tarifs négociés pour vos clients' },
  stock: { title: 'État du stock', sub: 'Disponibilité dépôt et alertes — lecture seule' },
  chat: { title: 'Support & chat', sub: 'Messages de vos clients assignés' }
};

const ADMIN_TAB_TITLES = {
  accueil: { title: 'Tableau de bord', sub: 'Vue d\'ensemble de l\'activité HB Commerce' },
  produits: { title: 'Produits', sub: 'Catalogue, stock et tarification' },
  fournisseurs: { title: 'Fournisseurs', sub: 'Comptes fournisseurs et commandes' },
  stock: { title: 'Stock & achats', sub: 'Dépôt, achats, casse/pertes et réceptions' },
  equipe: { title: 'Équipe HB', sub: 'Agents commerciaux et livreurs — création et accès aux espaces dédiés' },
  commandes: { title: 'Commandes clients', sub: 'Suivi des ventes B2B' },
  clients: { title: 'Clients', sub: 'Comptes clients et agents commerciaux' },
  prix: { title: 'Prix personnalisés', sub: 'Tarifs par société et volume' },
  analyses: { title: 'Analyses', sub: 'Gains, dépenses et résultat net' },
  construction: { title: 'Construction du site', sub: 'Avancement, existant et tâches restantes' },
  chat: { title: 'Support & chat', sub: 'Modération et réponses clients' }
};

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function isThisMonth(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function countOrdersByStatus(orders, statuses) {
  return orders.filter((o) => statuses.includes(o.status)).length;
}

function sumRevenue(orders, filterFn) {
  return orders
    .filter((o) => o.status !== 'annulee' && filterFn(o))
    .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
}

function buildSalesChartData(orders, days = 7) {
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    const total = orders
      .filter((o) => o.status !== 'annulee' && o.created_at?.slice(0, 10) === key)
      .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    buckets.push({ label, total });
  }
  const max = Math.max(...buckets.map((b) => b.total), 1);
  return buckets.map((b) => ({ ...b, pct: Math.round((b.total / max) * 100) }));
}

function buildStatusDistribution(orders) {
  const counts = {};
  orders.forEach((o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(ADMIN_ORDER_STATUS_SHORT).map(([key, label]) => ({
    key,
    label,
    count: counts[key] || 0,
    pct: Math.round(((counts[key] || 0) / total) * 100)
  })).filter((r) => r.count > 0);
}

async function loadAdminDashboard() {
  const host = document.getElementById('adminDashboardHost');
  if (!host) return;

  host.innerHTML = '<p class="empty-state">Chargement du tableau de bord…</p>';

  const [orders, products, supplierOrders, profiles, alerts] = await Promise.all([
    fetchAllOrders(),
    fetchAllProducts(),
    fetchSupplierOrders(),
    fetchAllProfiles(),
    typeof fetchStockAlerts === 'function' ? fetchStockAlerts() : Promise.resolve([])
  ]);

  const revenueMonth = sumRevenue(orders, isThisMonth);
  const ordersToday = orders.filter((o) => isToday(o.created_at)).length;
  const pending = countOrdersByStatus(orders, ['en_attente', 'validee', 'en_attente_paiement']);
  const inPrep = countOrdersByStatus(orders, ['payee', 'en_preparation']);
  const outOfStock = products.filter((p) => (p.stock_quantity ?? 0) <= 0).length;
  const lowStock = products.filter((p) => {
    const q = p.stock_quantity ?? 0;
    const min = p.min_stock_alert ?? 10;
    return q > 0 && q <= min;
  }).length;
  const pendingReceipt = supplierOrders.filter((o) =>
    ['requested', 'accepted', 'in_preparation', 'shipped'].includes(o.status) && !(o.depot_received ?? false)
  ).length;
  const activeClients = profiles.filter((p) => p.role === 'client').length;
  const topProducts = aggregateProductSales(orders).slice(0, 5);
  const salesChart = buildSalesChartData(orders);
  const statusDist = buildStatusDistribution(orders);

  host.innerHTML = `
    <div class="dash-kpi-grid">
      <article class="dash-kpi-card dash-kpi-card--accent">
        <span class="dash-kpi-label">CA du mois</span>
        <strong class="dash-kpi-value">${formatPrice(revenueMonth)}</strong>
        <span class="dash-kpi-hint">Hors commandes annulées</span>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">Commandes aujourd'hui</span>
        <strong class="dash-kpi-value">${ordersToday}</strong>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">En attente</span>
        <strong class="dash-kpi-value dash-kpi-value--warn">${pending}</strong>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">En préparation</span>
        <strong class="dash-kpi-value">${inPrep}</strong>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">Rupture stock</span>
        <strong class="dash-kpi-value dash-kpi-value--warn">${outOfStock}</strong>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">Stock faible</span>
        <strong class="dash-kpi-value">${lowStock}</strong>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">Achats à réceptionner</span>
        <strong class="dash-kpi-value">${pendingReceipt}</strong>
      </article>
      <article class="dash-kpi-card">
        <span class="dash-kpi-label">Clients actifs</span>
        <strong class="dash-kpi-value dash-kpi-value--ok">${activeClients}</strong>
      </article>
    </div>

    <div class="dash-charts-grid">
      <section class="dash-chart-card">
        <h3>Évolution des ventes (7 jours)</h3>
        <div class="dash-bar-chart">
          ${salesChart.map((b) => `
            <div class="dash-bar-col" title="${formatPrice(b.total)}">
              <div class="dash-bar" style="height:${Math.max(4, b.pct)}%"></div>
              <span class="dash-bar-label">${escapeHtml(b.label)}</span>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="dash-chart-card">
        <h3>Répartition commandes par statut</h3>
        <div class="dash-status-list">
          ${statusDist.map((s) => `
            <div class="dash-status-row">
              <span>${escapeHtml(s.label)}</span>
              <strong>${s.count}</strong>
              <div class="dash-status-bar"><div class="dash-status-fill" style="width:${s.pct}%"></div></div>
            </div>
          `).join('') || '<p class="empty-state">Aucune commande</p>'}
        </div>
      </section>
    </div>

    <section class="dash-chart-card">
      <h3>Produits les plus vendus</h3>
      <ul class="dash-top-products">
        ${topProducts.length ? topProducts.map((p) => `
          <li><span>${escapeHtml(p.name)}</span><strong>${p.qty} unités · ${formatPrice(p.revenue)}</strong></li>
        `).join('') : '<li>Aucune vente enregistrée</li>'}
      </ul>
    </section>

    ${alerts.length ? `<p class="form-note" style="margin-top:1rem">${alerts.length} alerte(s) stock active(s) — consultez l'onglet Stock.</p>` : ''}
  `;
}

function updateAdminTopbar(tabId) {
  const titles = window.HB_COMMERCIAL_SPACE ? COMMERCIAL_TAB_TITLES : ADMIN_TAB_TITLES;
  const meta = titles[tabId] || (window.HB_COMMERCIAL_SPACE ? COMMERCIAL_TAB_TITLES.commandes : ADMIN_TAB_TITLES.accueil);
  const title = document.getElementById('adminTopbarTitle');
  const sub = document.getElementById('adminTopbarSub');
  if (title) title.textContent = meta.title;
  if (sub) sub.textContent = meta.sub;
}

window.loadAdminDashboard = loadAdminDashboard;
window.updateAdminTopbar = updateAdminTopbar;
window.ADMIN_TAB_TITLES = ADMIN_TAB_TITLES;
