/**
 * Admin — suivi construction du site (roadmap, progression, tâches)
 */

const ROADMAP_CATEGORY_LABELS = {
  front: 'Site public',
  admin: 'Administration',
  auth: 'Comptes & auth',
  stock: 'Stock & achats',
  legal: 'Pages légales',
  infra: 'Technique',
  general: 'Général'
};

const ROADMAP_STATUS_LABELS = {
  done: 'Terminé',
  in_progress: 'En cours',
  todo: 'À faire'
};

const ROADMAP_LOCAL_KEY = 'hb_site_roadmap_items';

const DEFAULT_ROADMAP_ITEMS = [
  { category: 'front', title: 'Page d\'accueil premium B2B', notes: 'Hero 3D, catalogue, FAQ, devis', status: 'done', sort_order: 10 },
  { category: 'front', title: 'Catalogue produits & filtres', notes: 'Cartes premium, stock, multi-marches', status: 'done', sort_order: 20 },
  { category: 'front', title: 'Mode clair / sombre accueil', notes: 'Bouton theme avec memorisation', status: 'done', sort_order: 30 },
  { category: 'auth', title: 'Inscription & espace client', notes: 'Wizard, compte, panier, commandes', status: 'done', sort_order: 50 },
  { category: 'admin', title: 'Admin v2 complet', notes: 'Produits, clients, fournisseurs, analyses', status: 'done', sort_order: 70 },
  { category: 'stock', title: 'Stock, achats & incidents', notes: 'Casse, pertes, reception depot', status: 'done', sort_order: 100 },
  { category: 'infra', title: 'Paiement Stripe', notes: 'Integration checkout a valider', status: 'in_progress', sort_order: 200 },
  { category: 'front', title: 'Optimisation mobile avancee', notes: 'Tests responsive approfondis', status: 'todo', sort_order: 300 }
];

let roadmapItemsCache = [];
let editingRoadmapId = null;
let roadmapInitialized = false;

function loadRoadmapFromLocal() {
  try {
    const raw = localStorage.getItem(ROADMAP_LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_ROADMAP_ITEMS.map((item, index) => ({
    ...item,
    id: `local-${index + 1}`,
    created_at: new Date().toISOString()
  }));
}

function saveRoadmapToLocal(items) {
  try {
    localStorage.setItem(ROADMAP_LOCAL_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function computeRoadmapProgress(items) {
  const list = items || [];
  const total = list.length || 1;
  const done = list.filter((item) => item.status === 'done').length;
  const inProgress = list.filter((item) => item.status === 'in_progress').length;
  const todo = list.filter((item) => item.status === 'todo').length;
  const weighted = done + inProgress * 0.5;
  const percent = Math.round((weighted / total) * 100);
  const strictPercent = Math.round((done / total) * 100);
  return { done, inProgress, todo, total, percent, strictPercent };
}

function filterRoadmapItems(items) {
  const category = document.getElementById('roadmapFilterCategory')?.value || '';
  const status = document.getElementById('roadmapFilterStatus')?.value || '';
  return (items || []).filter((item) => {
    if (category && item.category !== category) return false;
    if (status && item.status !== status) return false;
    return true;
  });
}

function renderRoadmapProgress(items) {
  const host = document.getElementById('roadmapProgressHost');
  if (!host) return;
  const stats = computeRoadmapProgress(items);
  host.innerHTML = `
    <div class="roadmap-progress-card">
      <div class="roadmap-progress-head">
        <div>
          <h2>Avancement global du site</h2>
          <p class="auth-sub" style="margin:0.35rem 0 0">${stats.done} terminé(s) · ${stats.inProgress} en cours · ${stats.todo} restant(s) sur ${stats.total} éléments</p>
        </div>
        <div class="roadmap-progress-pct" aria-label="Progression">${stats.percent}%</div>
      </div>
      <div class="roadmap-progress-bar" role="progressbar" aria-valuenow="${stats.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="roadmap-progress-fill" style="width:${stats.percent}%"></div>
      </div>
      <div class="roadmap-stats">
        <div class="roadmap-stat"><strong>${stats.done}</strong><span>Existe / terminé</span></div>
        <div class="roadmap-stat"><strong>${stats.inProgress}</strong><span>En construction</span></div>
        <div class="roadmap-stat"><strong>${stats.todo}</strong><span>À faire / manque</span></div>
      </div>
      <p class="form-note" style="margin-top:0.85rem;margin-bottom:0">Progression pondérée (en cours = 50%). Strictement terminé : ${stats.strictPercent}%.</p>
    </div>
  `;
}

function renderRoadmapTable(items) {
  const body = document.getElementById('roadmapItemsBody');
  if (!body) return;
  const filtered = filterRoadmapItems(items);
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="5">Aucun élément pour ce filtre.</td></tr>';
    return;
  }

  const groups = [
    { key: 'done', title: 'Ce qui existe déjà / terminé' },
    { key: 'in_progress', title: 'En cours de construction' },
    { key: 'todo', title: 'À faire / manquant' }
  ];

  let html = '';
  groups.forEach((group) => {
    const groupItems = filtered.filter((item) => item.status === group.key);
    if (!groupItems.length) return;
    html += `<tr class="roadmap-group-row"><td colspan="5"><div class="roadmap-section-title">${group.title} (${groupItems.length})</div></td></tr>`;
    html += groupItems.map((item) => `
      <tr data-roadmap-id="${item.id}">
        <td><span class="roadmap-category-badge">${escapeHtml(ROADMAP_CATEGORY_LABELS[item.category] || item.category)}</span></td>
        <td><strong>${escapeHtml(item.title)}</strong>${item.notes ? `<div class="roadmap-item-notes">${escapeHtml(item.notes)}</div>` : ''}</td>
        <td><span class="roadmap-status-badge roadmap-status-badge--${item.status}">${escapeHtml(ROADMAP_STATUS_LABELS[item.status] || item.status)}</span></td>
        <td>${item.updated_at ? formatDate(item.updated_at) : (item.created_at ? formatDate(item.created_at) : '—')}</td>
        <td class="roadmap-actions">
          <button type="button" class="btn btn-sm btn-outline-dark" data-roadmap-edit="${item.id}">Modifier</button>
          ${item.status !== 'done' ? `<button type="button" class="btn btn-sm btn-outline-dark" data-roadmap-done="${item.id}">✓ Terminé</button>` : ''}
          <button type="button" class="btn btn-sm btn-outline-dark" data-roadmap-delete="${item.id}" title="Supprimer">×</button>
        </td>
      </tr>
    `).join('');
  });

  body.innerHTML = html || '<tr><td colspan="5">Aucun élément.</td></tr>';

  body.querySelectorAll('[data-roadmap-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openRoadmapEditModal(btn.dataset.roadmapEdit));
  });
  body.querySelectorAll('[data-roadmap-done]').forEach((btn) => {
    btn.addEventListener('click', () => markRoadmapDone(btn.dataset.roadmapDone));
  });
  body.querySelectorAll('[data-roadmap-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteRoadmapItem(btn.dataset.roadmapDelete));
  });
}

function renderRoadmapPanel() {
  renderRoadmapProgress(roadmapItemsCache);
  renderRoadmapTable(roadmapItemsCache);
  const note = document.getElementById('roadmapPanelNote');
  if (note && roadmapItemsCache[0]?.id?.startsWith('local-')) {
    note.textContent = 'Mode local actif — exécutez supabase/migration-site-roadmap.sql pour synchroniser en base.';
  } else if (note) {
    note.textContent = '';
  }
}

async function loadRoadmapItems() {
  let items = null;
  if (typeof fetchSiteRoadmapItems === 'function') {
    items = await fetchSiteRoadmapItems();
  }
  if (items === null) {
    items = loadRoadmapFromLocal();
  }
  roadmapItemsCache = items;
  renderRoadmapPanel();
  return items;
}

function resetRoadmapForm() {
  editingRoadmapId = null;
  const form = document.getElementById('roadmapItemForm');
  form?.reset();
  document.getElementById('roadmapFormTitle').textContent = 'Ajouter une tâche / fonctionnalité';
  document.getElementById('saveRoadmapBtn').textContent = 'Ajouter';
}

function openRoadmapEditModal(id) {
  const item = roadmapItemsCache.find((entry) => entry.id === id);
  const form = document.getElementById('roadmapItemForm');
  if (!item || !form) return;
  editingRoadmapId = id;
  form.category.value = item.category || 'general';
  form.title.value = item.title || '';
  form.notes.value = item.notes || '';
  form.status.value = item.status || 'todo';
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
    try {
      return await createSiteRoadmapItem(payload);
    } catch (err) {
      if (!err.message?.includes('site_roadmap_items')) throw err;
    }
  }
  if (id) {
    roadmapItemsCache = roadmapItemsCache.map((item) => (item.id === id ? { ...item, ...payload, updated_at: new Date().toISOString() } : item));
    saveRoadmapToLocal(roadmapItemsCache);
    return roadmapItemsCache.find((item) => item.id === id);
  }
  const newItem = {
    ...payload,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  roadmapItemsCache.push(newItem);
  saveRoadmapToLocal(roadmapItemsCache);
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
    sort_order: parseInt(fd.get('sort_order'), 10) || 0
  };
  if (!payload.title) {
    showAlert(note, 'Titre requis.');
    return;
  }
  try {
    const wasEdit = !!editingRoadmapId;
    await persistRoadmapItem(payload, editingRoadmapId);
    closeAppModal('roadmapItemModal');
    resetRoadmapForm();
    await loadRoadmapItems();
    showAlert(document.getElementById('roadmapPanelNote'), wasEdit ? 'Élément mis à jour.' : 'Élément ajouté.', 'success');
  } catch (err) {
    showAlert(note, err.message);
  }
}

async function markRoadmapDone(id) {
  try {
    await persistRoadmapItem({ status: 'done' }, id);
    await loadRoadmapItems();
  } catch (err) {
    showAlert(document.getElementById('roadmapPanelNote'), err.message);
  }
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
  document.getElementById('roadmapFilterCategory')?.addEventListener('change', renderRoadmapPanel);
  document.getElementById('roadmapFilterStatus')?.addEventListener('change', renderRoadmapPanel);
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
