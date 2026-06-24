/**
 * Admin — centre de pilotage construction du site (roadmap avancée)
 */

const ROADMAP_CATEGORY_LABELS = {
  frontend: 'Frontend',
  backend: 'Backend',
  auth: 'Authentification',
  products: 'Produits',
  orders: 'Commandes',
  suppliers: 'Fournisseurs',
  payments: 'Paiements',
  messaging: 'Messagerie',
  negotiation: 'Négociation commerciale',
  dashboard: 'Dashboard',
  qa: 'Tests QA',
  front: 'Site public',
  admin: 'Administration',
  stock: 'Stock & achats',
  legal: 'Pages légales',
  infra: 'Technique',
  general: 'Général'
};

const ROADMAP_CATEGORY_ORDER = [
  'frontend', 'backend', 'auth', 'products', 'orders', 'suppliers',
  'payments', 'messaging', 'negotiation', 'dashboard', 'qa',
  'front', 'admin', 'stock', 'legal', 'infra', 'general'
];

const ROADMAP_STATUS_LABELS = {
  done: 'Développé',
  validated: 'Validé',
  in_progress: 'En cours',
  todo: 'À faire',
  blocked: 'Bloqué'
};

const ROADMAP_PRIORITY_LABELS = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };

const ROADMAP_LOCAL_KEY = 'hb_site_roadmap_items';
const ROADMAP_PROJECT_START = '2025-09-01';

const DEFAULT_ROADMAP_ITEMS = [
  { category: 'frontend', title: 'Page d\'accueil premium B2B', notes: 'Hero 3D, catalogue, FAQ', status: 'validated', priority: 'high', sort_order: 10 },
  { category: 'frontend', title: 'Catalogue produits & filtres', notes: 'Cartes premium, stock', status: 'validated', priority: 'high', sort_order: 20 },
  { category: 'frontend', title: 'Responsive mobile avancé', notes: 'Navigation, grilles', status: 'in_progress', priority: 'high', sort_order: 30 },
  { category: 'auth', title: 'Connexion & inscription', notes: 'Supabase Auth, wizard pro', status: 'validated', priority: 'high', sort_order: 40 },
  { category: 'auth', title: 'Masquage prix non connecté', notes: 'HB_CAN_VIEW_PRICES', status: 'validated', priority: 'medium', sort_order: 50 },
  { category: 'products', title: 'Fiches produit & stock', notes: 'Disponibilité, délais', status: 'validated', priority: 'high', sort_order: 60 },
  { category: 'products', title: 'Tarifs personnalisés client', notes: 'customer_prices', status: 'done', priority: 'medium', sort_order: 70 },
  { category: 'orders', title: 'Panier & checkout', notes: 'localStorage, validation stock', status: 'validated', priority: 'high', sort_order: 80 },
  { category: 'orders', title: 'Suivi de commande client', notes: 'Timeline 7 étapes', status: 'validated', priority: 'high', sort_order: 90 },
  { category: 'suppliers', title: 'Gestion fournisseurs admin', notes: 'CRUD, espace supplier', status: 'validated', priority: 'high', sort_order: 100 },
  { category: 'payments', title: 'Stripe & virement', notes: 'Checkout multi-modes', status: 'in_progress', priority: 'high', sort_order: 110 },
  { category: 'messaging', title: 'Chat client / admin', notes: 'Modération, tickets', status: 'validated', priority: 'medium', sort_order: 120 },
  { category: 'negotiation', title: 'Module négociation B2B', notes: 'Offres, messagerie, conversion', status: 'in_progress', priority: 'high', sort_order: 130 },
  { category: 'dashboard', title: 'Admin v2 — commandes & clients', notes: 'Sidebar, KPIs', status: 'validated', priority: 'high', sort_order: 140 },
  { category: 'dashboard', title: 'Analyses financières', notes: 'CA, dépenses, marges', status: 'done', priority: 'medium', sort_order: 150 },
  { category: 'dashboard', title: 'Centre de pilotage construction', notes: 'Roadmap avancée', status: 'in_progress', priority: 'high', sort_order: 160 },
  { category: 'qa', title: 'Module exigences & traçabilité', notes: 'REQ/TEST matrix', status: 'in_progress', priority: 'high', sort_order: 170 },
  { category: 'qa', title: 'Tests Playwright automatisés', notes: 'Auth, commandes, QA', status: 'in_progress', priority: 'high', sort_order: 180 },
  { category: 'backend', title: 'Schéma Supabase complet', notes: 'RLS, migrations', status: 'validated', priority: 'high', sort_order: 200 },
  { category: 'backend', title: 'Gestion stock RPC', notes: 'Déduction à la commande', status: 'validated', priority: 'high', sort_order: 210 },
  { category: 'infra', title: 'Déploiement GitHub Pages', notes: 'CI, domaine', status: 'todo', priority: 'medium', sort_order: 300 },
  { category: 'legal', title: 'CGV & confidentialité', notes: 'Pages légales', status: 'done', priority: 'low', sort_order: 310 }
];

let roadmapItemsCache = [];
let editingRoadmapId = null;
let roadmapInitialized = false;

function loadRoadmapFromLocal() {
  try {
    const raw = localStorage.getItem(ROADMAP_LOCAL_KEY);
    if (raw) return JSON.parse(raw).map(normalizeRoadmapItem);
  } catch { /* ignore */ }
  return DEFAULT_ROADMAP_ITEMS.map((item, index) => normalizeRoadmapItem({
    ...item,
    id: `local-${index + 1}`,
    created_at: ROADMAP_PROJECT_START
  }));
}

function normalizeRoadmapItem(item) {
  return {
    priority: 'medium',
    validated_at: null,
    ...item,
    category: item.category || 'general',
    status: item.status || 'todo'
  };
}

function saveRoadmapToLocal(items) {
  try { localStorage.setItem(ROADMAP_LOCAL_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function computeRoadmapProgress(items) {
  const list = items || [];
  const total = list.length || 1;
  const done = list.filter((i) => ['done', 'validated'].includes(i.status)).length;
  const validated = list.filter((i) => i.status === 'validated').length;
  const developed = list.filter((i) => ['done', 'validated', 'in_progress'].includes(i.status)).length;
  const inProgress = list.filter((i) => i.status === 'in_progress').length;
  const todo = list.filter((i) => i.status === 'todo').length;
  const blocked = list.filter((i) => i.status === 'blocked').length;
  const remaining = todo + inProgress + blocked;
  const weighted = validated + (done - validated) * 0.85 + inProgress * 0.5;
  const percent = Math.min(100, Math.round((weighted / total) * 100));
  const strictPercent = Math.round((validated / total) * 100);
  const modules = new Set(list.map((i) => i.category));
  const modulesDone = [...modules].filter((cat) => {
    const catItems = list.filter((i) => i.category === cat);
    return catItems.length && catItems.every((i) => ['done', 'validated'].includes(i.status));
  }).length;
  return {
    done, validated, developed, inProgress, todo, blocked, remaining, total,
    percent, strictPercent, modules: modules.size, modulesDone
  };
}

function computeCategoryProgress(items) {
  const cats = {};
  (items || []).forEach((item) => {
    const cat = item.category || 'general';
    if (!cats[cat]) cats[cat] = { total: 0, done: 0, inProgress: 0, todo: 0, blocked: 0 };
    cats[cat].total++;
    if (['done', 'validated'].includes(item.status)) cats[cat].done++;
    else if (item.status === 'in_progress') cats[cat].inProgress++;
    else if (item.status === 'blocked') cats[cat].blocked++;
    else cats[cat].todo++;
  });
  return Object.entries(cats)
    .map(([key, s]) => ({
      key,
      label: ROADMAP_CATEGORY_LABELS[key] || key,
      ...s,
      percent: s.total ? Math.round((s.done / s.total) * 100) : 0,
      remaining: s.total - s.done
    }))
    .sort((a, b) => ROADMAP_CATEGORY_ORDER.indexOf(a.key) - ROADMAP_CATEGORY_ORDER.indexOf(b.key));
}

function estimateRemainingDays(items) {
  const s = computeRoadmapProgress(items);
  return s.todo * 3 + s.inProgress * 1.5 + s.blocked * 5;
}

function filterRoadmapItems(items) {
  const category = document.getElementById('roadmapFilterCategory')?.value || '';
  const status = document.getElementById('roadmapFilterStatus')?.value || '';
  const priority = document.getElementById('roadmapFilterPriority')?.value || '';
  return (items || []).filter((item) => {
    if (category && item.category !== category) return false;
    if (status && item.status !== status) return false;
    if (priority && (item.priority || 'medium') !== priority) return false;
    return true;
  });
}

function renderRoadmapKpiCards(items) {
  const host = document.getElementById('roadmapKpiHost');
  if (!host) return;
  const s = computeRoadmapProgress(items);
  const daysLeft = Math.ceil(estimateRemainingDays(items));
  host.innerHTML = `
    <div class="roadmap-kpi-grid">
      <div class="roadmap-kpi roadmap-kpi--accent"><span class="roadmap-kpi-label">Progression globale</span><strong>${s.percent}%</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Fonctionnalités</span><strong>${s.total}</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Développées</span><strong>${s.developed}</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Validées</span><strong>${s.validated}</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Restantes</span><strong>${s.remaining}</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Bloquées</span><strong>${s.blocked}</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Modules terminés</span><strong>${s.modulesDone}/${s.modules}</strong></div>
      <div class="roadmap-kpi"><span class="roadmap-kpi-label">Jours estimés restants</span><strong>~${daysLeft}j</strong></div>
    </div>
  `;
}

function renderRoadmapProgress(items) {
  const host = document.getElementById('roadmapProgressHost');
  if (!host) return;
  const stats = computeRoadmapProgress(items);
  const startDate = formatDate(ROADMAP_PROJECT_START);
  host.innerHTML = `
    <div class="roadmap-progress-card">
      <div class="roadmap-progress-head">
        <div>
          <h2>Avancement global du projet</h2>
          <p class="auth-sub" style="margin:0.35rem 0 0">Projet démarré le ${startDate} · ${stats.validated} validée(s) · ${stats.inProgress} en cours · ${stats.remaining} restante(s)</p>
        </div>
        <div class="roadmap-progress-pct" aria-label="Progression">${stats.percent}%</div>
      </div>
      <div class="roadmap-progress-bar" role="progressbar" aria-valuenow="${stats.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="roadmap-progress-fill" style="width:${stats.percent}%"></div>
      </div>
      <p class="form-note" style="margin-top:0.75rem;margin-bottom:0">Taux de validation stricte : ${stats.strictPercent}% · Modules complets : ${stats.modulesDone}/${stats.modules}</p>
    </div>
  `;
}

function renderCategoryBars(items) {
  const host = document.getElementById('roadmapCategoryHost');
  if (!host) return;
  const cats = computeCategoryProgress(items);
  host.innerHTML = `
    <div class="dashboard-card dashboard-card-wide">
      <h2>Progression par catégorie</h2>
      <div class="roadmap-category-bars">
        ${cats.map((c) => `
          <div class="roadmap-cat-row">
            <div class="roadmap-cat-head">
              <span>${escapeHtml(c.label)}</span>
              <strong>${c.percent}%</strong>
            </div>
            <div class="roadmap-progress-bar roadmap-progress-bar--sm"><div class="roadmap-progress-fill" style="width:${c.percent}%"></div></div>
            <small>${c.done} terminée(s) · ${c.remaining} restante(s) · ${c.inProgress} en cours</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRoadmapTimeline(items) {
  const host = document.getElementById('roadmapTimelineHost');
  if (!host) return;
  const sorted = [...(items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const done = sorted.filter((i) => ['done', 'validated'].includes(i.status));
  const wip = sorted.filter((i) => i.status === 'in_progress');
  const future = sorted.filter((i) => ['todo', 'blocked'].includes(i.status));

  const line = (icon, item, cls) => `
    <li class="roadmap-timeline-item ${cls}">
      <span class="roadmap-timeline-icon" aria-hidden="true">${icon}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(ROADMAP_CATEGORY_LABELS[item.category] || item.category)} · ${ROADMAP_STATUS_LABELS[item.status]}</small>
      </div>
    </li>
  `;

  host.innerHTML = `
    <div class="dashboard-card dashboard-card-wide">
      <h2>Roadmap du projet</h2>
      <ul class="roadmap-timeline">
        ${done.map((i) => line('✓', i, 'is-done')).join('')}
        ${wip.map((i) => line('⏳', i, 'is-current')).join('')}
        ${future.map((i) => line(i.status === 'blocked' ? '⛔' : '🔒', i, 'is-future')).join('')}
      </ul>
    </div>
  `;
}

function renderRoadmapCharts(items) {
  const host = document.getElementById('roadmapChartsHost');
  if (!host) return;
  const s = computeRoadmapProgress(items);
  const cats = computeCategoryProgress(items).slice(0, 8);

  host.innerHTML = `
    <div class="roadmap-charts-grid">
      <div class="roadmap-chart-card">
        <h3>Évolution de l'avancement</h3>
        <div class="roadmap-bar-chart">
          <div class="roadmap-bar-row"><span>Validées</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill roadmap-bar-fill--ok" style="width:${s.strictPercent}%"></div></div><b>${s.strictPercent}%</b></div>
          <div class="roadmap-bar-row"><span>Développées</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill" style="width:${Math.round((s.developed / s.total) * 100)}%"></div></div><b>${s.developed}</b></div>
          <div class="roadmap-bar-row"><span>En cours</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill roadmap-bar-fill--warn" style="width:${Math.round((s.inProgress / s.total) * 100)}%"></div></div><b>${s.inProgress}</b></div>
          <div class="roadmap-bar-row"><span>Restantes</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill roadmap-bar-fill--muted" style="width:${Math.round((s.remaining / s.total) * 100)}%"></div></div><b>${s.remaining}</b></div>
        </div>
      </div>
      <div class="roadmap-chart-card">
        <h3>Répartition des tâches</h3>
        <div class="roadmap-bar-chart">
          <div class="roadmap-bar-row"><span>Validées</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill roadmap-bar-fill--ok" style="width:${(s.validated / s.total) * 100}%"></div></div><b>${s.validated}</b></div>
          <div class="roadmap-bar-row"><span>Développées</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill" style="width:${((s.done - s.validated) / s.total) * 100}%"></div></div><b>${s.done - s.validated}</b></div>
          <div class="roadmap-bar-row"><span>En cours</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill roadmap-bar-fill--warn" style="width:${(s.inProgress / s.total) * 100}%"></div></div><b>${s.inProgress}</b></div>
          <div class="roadmap-bar-row"><span>Bloquées</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill roadmap-bar-fill--ko" style="width:${(s.blocked / s.total) * 100}%"></div></div><b>${s.blocked}</b></div>
        </div>
      </div>
      <div class="roadmap-chart-card">
        <h3>Répartition par module</h3>
        <div class="roadmap-bar-chart">
          ${cats.map((c) => `
            <div class="roadmap-bar-row"><span>${escapeHtml(c.label)}</span><div class="roadmap-bar-track"><div class="roadmap-bar-fill" style="width:${c.percent}%"></div></div><b>${c.percent}%</b></div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function syncRoadmapWithQa(items) {
  if (typeof fetchQaRequirements !== 'function') return items;
  try {
    const [reqs, tests] = await Promise.all([
      fetchQaRequirements(),
      typeof fetchQaTestCases === 'function' ? fetchQaTestCases() : Promise.resolve([])
    ]);
    const developed = reqs.filter((r) => ['developpe', 'valide'].includes(r.dev_status)).length;
    const withTests = reqs.filter((r) =>
      tests.some((t) => t.requirement_id === r.id || t.req_ref === r.req_id)
    ).length;
    const note = `${withTests}/${reqs.length} exigences couvertes · ${developed} développées`;
    const gaps = typeof detectNewFeaturesWithoutTests === 'function'
      ? detectNewFeaturesWithoutTests(items, reqs, tests)
      : [];
    const gapNote = gaps.length ? ` · ${gaps.length} fonctionnalité(s) sans tests` : '';
    return items.map((i) => {
      if (i.category === 'qa' && i.title?.toLowerCase().includes('exigence')) {
        return {
          ...i,
          notes: note + gapNote,
          status: withTests === reqs.length && reqs.length ? 'validated' : i.status
        };
      }
      if (gaps.some((g) => g.message.includes(i.title))) {
        return { ...i, notes: `${i.notes || ''} · ⚠ Aucun test QA associé`.trim() };
      }
      return i;
    });
  } catch { return items; }
}

function renderRoadmapTable(items) {
  const body = document.getElementById('roadmapItemsBody');
  if (!body) return;
  const filtered = filterRoadmapItems(items);
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6">Aucun élément pour ce filtre.</td></tr>';
    return;
  }

  const groups = [
    { key: 'validated', title: 'Validées' },
    { key: 'done', title: 'Développées — en attente de validation' },
    { key: 'in_progress', title: 'En cours de développement' },
    { key: 'blocked', title: 'Bloquées' },
    { key: 'todo', title: 'À développer' }
  ];

  let html = '';
  groups.forEach((group) => {
    const groupItems = filtered.filter((item) => item.status === group.key);
    if (!groupItems.length) return;
    html += `<tr class="roadmap-group-row"><td colspan="6"><div class="roadmap-section-title">${group.title} (${groupItems.length})</div></td></tr>`;
    html += groupItems.map((item) => `
      <tr data-roadmap-id="${item.id}">
        <td><span class="roadmap-category-badge">${escapeHtml(ROADMAP_CATEGORY_LABELS[item.category] || item.category)}</span></td>
        <td><strong>${escapeHtml(item.title)}</strong>${item.notes ? `<div class="roadmap-item-notes">${escapeHtml(item.notes)}</div>` : ''}</td>
        <td><span class="roadmap-priority roadmap-priority--${item.priority || 'medium'}">${ROADMAP_PRIORITY_LABELS[item.priority] || 'Moyenne'}</span></td>
        <td><span class="roadmap-status-badge roadmap-status-badge--${item.status}">${escapeHtml(ROADMAP_STATUS_LABELS[item.status] || item.status)}</span></td>
        <td>${item.updated_at ? formatDate(item.updated_at) : (item.created_at ? formatDate(item.created_at) : '—')}</td>
        <td class="roadmap-actions">
          <button type="button" class="btn btn-sm btn-outline-dark" data-roadmap-edit="${item.id}">Modifier</button>
          ${!['done', 'validated'].includes(item.status) ? `<button type="button" class="btn btn-sm btn-outline-dark" data-roadmap-done="${item.id}">✓ Fait</button>` : ''}
          ${item.status === 'done' ? `<button type="button" class="btn btn-sm btn-primary" data-roadmap-validate="${item.id}">Valider</button>` : ''}
          <button type="button" class="btn btn-sm btn-outline-dark" data-roadmap-delete="${item.id}" title="Supprimer">×</button>
        </td>
      </tr>
    `).join('');
  });

  body.innerHTML = html || '<tr><td colspan="6">Aucun élément.</td></tr>';

  body.querySelectorAll('[data-roadmap-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openRoadmapEditModal(btn.dataset.roadmapEdit));
  });
  body.querySelectorAll('[data-roadmap-done]').forEach((btn) => {
    btn.addEventListener('click', () => persistRoadmapItem({ status: 'done' }, btn.dataset.roadmapDone).then(loadRoadmapItems));
  });
  body.querySelectorAll('[data-roadmap-validate]').forEach((btn) => {
    btn.addEventListener('click', () => persistRoadmapItem({ status: 'validated', validated_at: new Date().toISOString() }, btn.dataset.roadmapValidate).then(loadRoadmapItems));
  });
  body.querySelectorAll('[data-roadmap-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteRoadmapItem(btn.dataset.roadmapDelete));
  });
}

function renderRoadmapPanel() {
  renderRoadmapKpiCards(roadmapItemsCache);
  renderRoadmapProgress(roadmapItemsCache);
  renderCategoryBars(roadmapItemsCache);
  renderRoadmapTimeline(roadmapItemsCache);
  renderRoadmapCharts(roadmapItemsCache);
  renderRoadmapTable(roadmapItemsCache);
  const note = document.getElementById('roadmapPanelNote');
  if (note && roadmapItemsCache[0]?.id?.startsWith('local-')) {
    note.textContent = 'Mode local — synchronisez avec Supabase via migration-site-roadmap.sql.';
  } else if (note) note.textContent = '';
}

async function loadRoadmapItems() {
  let items = null;
  if (typeof fetchSiteRoadmapItems === 'function') {
    items = await fetchSiteRoadmapItems();
  }
  if (items === null || !items?.length) {
    items = loadRoadmapFromLocal();
  } else {
    items = items.map(normalizeRoadmapItem);
  }
  items = await syncRoadmapWithQa(items);
  roadmapItemsCache = items;
  saveRoadmapToLocal(items);
  renderRoadmapPanel();
  return items;
}

function resetRoadmapForm() {
  editingRoadmapId = null;
  document.getElementById('roadmapItemForm')?.reset();
  document.getElementById('roadmapFormTitle').textContent = 'Ajouter une tâche / fonctionnalité';
  document.getElementById('saveRoadmapBtn').textContent = 'Ajouter';
}

function openRoadmapEditModal(id) {
  const item = roadmapItemsCache.find((e) => e.id === id);
  const form = document.getElementById('roadmapItemForm');
  if (!item || !form) return;
  editingRoadmapId = id;
  form.category.value = item.category || 'general';
  form.title.value = item.title || '';
  form.notes.value = item.notes || '';
  form.status.value = item.status || 'todo';
  form.priority.value = item.priority || 'medium';
  form.sort_order.value = item.sort_order ?? 0;
  document.getElementById('roadmapFormTitle').textContent = 'Modifier l\'élément';
  document.getElementById('saveRoadmapBtn').textContent = 'Enregistrer';
  openAppModal('roadmapItemModal');
}

function openRoadmapAddModal() {
  resetRoadmapForm();
  openAppModal('roadmapItemModal');
}

async function persistRoadmapItem(payload, id = null) {
  if (id && !String(id).startsWith('local-') && typeof updateSiteRoadmapItem === 'function') {
    return updateSiteRoadmapItem(id, payload);
  }
  if (!id && typeof createSiteRoadmapItem === 'function') {
    try { return await createSiteRoadmapItem(payload); } catch (err) {
      if (!err.message?.includes('site_roadmap_items')) throw err;
    }
  }
  if (id) {
    roadmapItemsCache = roadmapItemsCache.map((item) => (item.id === id ? { ...item, ...payload, updated_at: new Date().toISOString() } : item));
    saveRoadmapToLocal(roadmapItemsCache);
    renderRoadmapPanel();
    return roadmapItemsCache.find((item) => item.id === id);
  }
  const newItem = normalizeRoadmapItem({
    ...payload,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  roadmapItemsCache.push(newItem);
  saveRoadmapToLocal(roadmapItemsCache);
  renderRoadmapPanel();
  return newItem;
}

async function handleRoadmapFormSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('roadmapFormNote');
  const fd = new FormData(e.target);
  const payload = {
    category: fd.get('category'),
    title: String(fd.get('title')).trim(),
    notes: String(fd.get('notes') || '').trim() || null,
    status: fd.get('status'),
    priority: fd.get('priority') || 'medium',
    sort_order: parseInt(fd.get('sort_order'), 10) || 0
  };
  if (!payload.title) { showAlert(note, 'Titre requis.'); return; }
  try {
    const wasEdit = !!editingRoadmapId;
    await persistRoadmapItem(payload, editingRoadmapId);
    closeAppModal('roadmapItemModal');
    resetRoadmapForm();
    await loadRoadmapItems();
    showAlert(document.getElementById('roadmapPanelNote'), wasEdit ? 'Élément mis à jour.' : 'Élément ajouté.', 'success');
  } catch (err) { showAlert(note, err.message); }
}

async function deleteRoadmapItem(id) {
  if (!confirm('Supprimer cet élément du suivi ?')) return;
  try {
    if (!String(id).startsWith('local-') && typeof deleteSiteRoadmapItem === 'function') {
      await deleteSiteRoadmapItem(id);
    } else {
      roadmapItemsCache = roadmapItemsCache.filter((item) => item.id !== id);
      saveRoadmapToLocal(roadmapItemsCache);
    }
    await loadRoadmapItems();
  } catch (err) {
    showAlert(document.getElementById('roadmapPanelNote'), err.message);
  }
}

function bindRoadmapPanel() {
  if (roadmapInitialized) return;
  roadmapInitialized = true;
  document.getElementById('openRoadmapAddBtn')?.addEventListener('click', openRoadmapAddModal);
  document.getElementById('refreshRoadmapBtn')?.addEventListener('click', loadRoadmapItems);
  ['roadmapFilterCategory', 'roadmapFilterStatus', 'roadmapFilterPriority'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', renderRoadmapPanel);
  });
  document.getElementById('roadmapItemForm')?.addEventListener('submit', handleRoadmapFormSubmit);
  document.getElementById('cancelRoadmapBtn')?.addEventListener('click', () => {
    closeAppModal('roadmapItemModal');
    resetRoadmapForm();
  });
}

async function initRoadmapAdminPanel() {
  bindRoadmapPanel();
  await loadRoadmapItems();
}

window.initRoadmapAdminPanel = initRoadmapAdminPanel;
window.loadRoadmapItems = loadRoadmapItems;
window.computeRoadmapProgress = computeRoadmapProgress;
