/**
 * Module QA — interface principale
 */

const QA_TAB_TITLES = {
  dashboard: ['Dashboard Qualité', 'Vue d\'ensemble et exécution des tests'],
  exigences: ['Exigences du Projet', 'Gestion des exigences fonctionnelles'],
  tests: ['Plan de Test', 'Cas de test manuels et automatiques'],
  tracabilite: ['Traçabilité', 'Matrice exigences ↔ tests'],
  rapports: ['Rapports QA', 'Historique et graphiques de qualité']
};

let qaCache = { requirements: [], tests: [], runs: [], executions: [] };
let qaEditingReqId = null;
let qaEditingTestId = null;
let qaRunPollTimer = null;

function qaOpenModal(id) {
  document.getElementById(id)?.removeAttribute('hidden');
}

function qaCloseModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function qaBindModals() {
  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => {
      el.closest('.app-modal')?.setAttribute('hidden', '');
    });
  });
}

function qaShowTab(tabId) {
  document.querySelectorAll('.admin-nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.admin-panel').forEach((panel) => {
    panel.hidden = panel.id !== `panel-${tabId}`;
  });
  const [title, sub] = QA_TAB_TITLES[tabId] || ['QA', ''];
  const t = document.getElementById('qaTopbarTitle');
  const s = document.getElementById('qaTopbarSub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
}

function qaResultClass(result) {
  if (result === 'OK') return 'qa-result-ok';
  if (result === 'KO') return 'qa-result-ko';
  if (result === 'Partiel') return 'qa-result-partial';
  return 'qa-result-none';
}

async function qaReloadAll() {
  const [requirements, tests, runs, executions] = await Promise.all([
    fetchQaRequirements(),
    fetchQaTestCases(),
    fetchQaTestRuns(),
    fetchQaExecutions()
  ]);
  qaCache = { requirements, tests, runs, executions };
  renderQaDashboard();
  renderQaRequirements();
  renderQaTests();
  renderQaTraceability();
  renderQaReports();
  renderQaAlerts();
  populateQaFilters();
}

function qaReadRoadmapItems() {
  try {
    const raw = localStorage.getItem('hb_site_roadmap_items');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function renderQaAlerts() {
  const host = document.getElementById('qaAlerts');
  if (!host) return;
  const roadmapItems = qaReadRoadmapItems();
  const integrationAlerts = typeof detectNewFeaturesWithoutTests === 'function'
    ? detectNewFeaturesWithoutTests(roadmapItems, qaCache.requirements, qaCache.tests)
    : [];
  const alerts = [
    ...detectQaGaps(qaCache.requirements, qaCache.tests, { executions: qaCache.executions }),
    ...integrationAlerts
  ];
  if (!alerts.length) {
    host.innerHTML = '<div class="qa-alert qa-alert--info">✓ Aucune anomalie de qualité détectée.</div>';
    return;
  }
  host.innerHTML = alerts.slice(0, 12).map((a) =>
    `<div class="qa-alert qa-alert--${a.severity === 'error' ? 'error' : a.severity === 'warning' ? 'warning' : 'info'}">${escapeHtml(a.message)}</div>`
  ).join('');
}

function devStatusLabel(status) {
  if (status === 'developpe' || status === 'valide') return 'Oui';
  if (status === 'en_cours') return 'En cours';
  return 'Non';
}

function renderQaCoverageTable() {
  const body = document.getElementById('qaCoverageTableBody');
  const note = document.getElementById('qaCoverageGlobalNote');
  if (!body) return;
  const trace = computeQaTraceability(qaCache.requirements, qaCache.tests);
  const stats = computeQaGlobalStats(qaCache.requirements, qaCache.tests, qaCache.runs);
  if (note) note.textContent = `Taux global : ${stats.functionalCoverage}%`;
  if (!trace.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune exigence</td></tr>';
    return;
  }
  body.innerHTML = trace.map((row) => {
    const req = row.requirement;
    const tested = row.executedCount > 0 ? 'Oui' : 'Non';
    const cov = row.testCount ? (row.executedCount ? row.coveragePct : 0) : 0;
    return `
      <tr>
        <td><strong>${escapeHtml(req.req_id)}</strong> — ${escapeHtml(req.name)}</td>
        <td>${devStatusLabel(req.dev_status)}</td>
        <td>${tested}</td>
        <td><strong>${cov}%</strong></td>
      </tr>`;
  }).join('');
}

function renderQaResultsTable() {
  const body = document.getElementById('qaResultsTableBody');
  if (!body) return;
  const execMap = {};
  qaCache.executions.forEach((e) => {
    if (!execMap[e.test_id] || new Date(e.executed_at) > new Date(execMap[e.test_id].executed_at)) {
      execMap[e.test_id] = e;
    }
  });
  const items = [...qaCache.tests].sort((a, b) => a.test_id.localeCompare(b.test_id));
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty-state">Aucun test</td></tr>';
    return;
  }
  body.innerHTML = items.map((t) => {
    const exec = execMap[t.test_id];
    const duration = exec?.duration_ms ? `${(exec.duration_ms / 1000).toFixed(2)}s` : '—';
    const resultLabel = QA_TEST_STATUS_LABELS[t.status] || t.status;
    return `
      <tr>
        <td><strong>${escapeHtml(t.test_id)}</strong></td>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.req_ref || '—')}</td>
        <td><span class="qa-status-pill ${t.status}">${resultLabel}</span></td>
        <td>${duration}</td>
        <td>${formatDateTime(t.last_run_at)}</td>
        <td class="${qaResultClass(t.status === 'succes' ? 'OK' : t.status === 'echec' ? 'KO' : 'En attente')}">${resultLabel}</td>
      </tr>`;
  }).join('');
}

function renderQaDashboardHistory() {
  const body = document.getElementById('qaHistoryTableBody');
  if (!body) return;
  const runs = qaCache.runs.length ? qaCache.runs : qaReadLocalRuns();
  if (!runs.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state">Aucune exécution — lancez les tests ci-dessus.</td></tr>';
    return;
  }
  body.innerHTML = runs.slice(0, 15).map((run) => {
    const started = run.started_at || run.startedAt;
    const d = started ? new Date(started) : null;
    const date = d ? d.toLocaleDateString('fr-FR') : '—';
    const time = d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
    const total = run.total_tests ?? run.results?.stats?.total ?? '—';
    const passed = run.passed_tests ?? run.results?.stats?.passed ?? '—';
    const failed = run.failed_tests ?? run.results?.stats?.failed ?? '—';
    const duration = run.duration_ms
      ? `${(run.duration_ms / 1000).toFixed(1)}s`
      : run.results?.stats?.duration
        ? `${(run.results.stats.duration / 1000).toFixed(1)}s`
        : '—';
    return `<tr>
      <td>${date}</td><td>${time}</td><td>${total}</td><td>${passed}</td><td>${failed}</td><td>${duration}</td>
    </tr>`;
  }).join('');
}

function renderQaDashboardCharts() {
  const runs = qaCache.runs.length ? qaCache.runs : qaReadLocalRuns();
  const recent = [...runs].slice(0, 8).reverse();
  renderBarChart('chartSuccessTrend', recent.map((r, i) => ({
    label: `Run ${i + 1}`,
    value: r.success_rate ?? (r.passed_tests && r.total_tests ? Math.round((r.passed_tests / r.total_tests) * 100) : 0),
    cls: 'qa-bar-fill--ok'
  })));

  const coverageHistory = recent.map((r, i) => ({
    label: `Run ${i + 1}`,
    value: r.functional_coverage ?? computeQaGlobalStats(qaCache.requirements, qaCache.tests).functionalCoverage,
    cls: 'qa-bar-fill--cover'
  }));
  renderBarChart('chartCoverageTrend', coverageHistory.length ? coverageHistory : [
    { label: 'Actuel', value: computeQaGlobalStats(qaCache.requirements, qaCache.tests).functionalCoverage, cls: 'qa-bar-fill--cover' }
  ]);

  const stats = computeQaGlobalStats(qaCache.requirements, qaCache.tests, qaCache.runs);
  renderBarChart('chartErrorSplit', [
    { label: 'Échecs', value: stats.failed, cls: 'qa-bar-fill--ko' },
    { label: 'Bloqués', value: stats.blocked, cls: 'qa-bar-fill--cover' },
    { label: 'Non exéc.', value: stats.pending },
    { label: 'Succès', value: stats.passed, cls: 'qa-bar-fill--ok' }
  ]);

  const byModule = computeTestsByModule(qaCache.requirements, qaCache.tests);
  renderBarChart('chartTestsByModule', byModule.map((m) => ({
    label: m.label,
    value: m.total,
    cls: m.failed ? 'qa-bar-fill--ko' : 'qa-bar-fill--cover'
  })));
}

function renderQaDashboard() {
  const stats = computeQaGlobalStats(qaCache.requirements, qaCache.tests, qaCache.runs);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('qaKpiTotalTests', stats.totalTests);
  set('qaKpiSuccessRate', `${stats.successRate}%`);
  set('qaKpiPassed', stats.passed);
  set('qaKpiFailed', stats.failed);
  set('qaKpiPending', stats.pending);
  set('qaKpiCoverage', `${stats.functionalCoverage}%`);
  set('qaKpiTotalReqs', stats.totalReqs);
  set('qaKpiDeveloped', `${stats.developed} / ${stats.validated}`);
  renderQaCoverageTable();
  renderQaResultsTable();
  renderQaDashboardHistory();
  renderQaDashboardCharts();
}

function getFilteredRequirements() {
  const search = (document.getElementById('reqSearch')?.value || '').toLowerCase();
  const status = document.getElementById('reqFilterStatus')?.value || '';
  const category = document.getElementById('reqFilterCategory')?.value || '';
  const priority = document.getElementById('reqFilterPriority')?.value || '';
  const sort = document.getElementById('reqSort')?.value || 'req_id';

  let items = [...qaCache.requirements];
  if (search) {
    items = items.filter((r) =>
      [r.req_id, r.name, r.description, r.category, r.owner].join(' ').toLowerCase().includes(search)
    );
  }
  if (status) items = items.filter((r) => r.dev_status === status);
  if (category) items = items.filter((r) => r.category === category);
  if (priority) items = items.filter((r) => r.priority === priority);

  const prioOrder = { Critique: 0, Haute: 1, Moyenne: 2, Basse: 3 };
  items.sort((a, b) => {
    if (sort === 'priority') return (prioOrder[a.priority] ?? 9) - (prioOrder[b.priority] ?? 9);
    return String(a[sort] || '').localeCompare(String(b[sort] || ''), 'fr');
  });
  return items;
}

function renderQaRequirements() {
  const body = document.getElementById('reqTableBody');
  if (!body) return;
  const items = getFilteredRequirements();
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="10" class="empty-state">Aucune exigence</td></tr>';
    return;
  }
  body.innerHTML = items.map((r) => `
    <tr>
      <td><strong>${escapeHtml(r.req_id)}</strong></td>
      <td>${escapeHtml(r.name)}</td>
      <td style="max-width:200px">${escapeHtml((r.description || '').slice(0, 80))}${(r.description || '').length > 80 ? '…' : ''}</td>
      <td>${escapeHtml(r.priority)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td><span class="qa-status-pill ${r.dev_status}">${QA_DEV_STATUS_LABELS[r.dev_status] || r.dev_status}</span></td>
      <td>${escapeHtml(r.owner || '—')}</td>
      <td>${formatDate(r.created_at)}</td>
      <td>${formatDate(r.updated_at)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-dark" data-req-edit="${r.id}">Modifier</button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-req-del="${r.id}">Suppr.</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-req-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openReqModal(btn.dataset.reqEdit));
  });
  body.querySelectorAll('[data-req-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteReq(btn.dataset.reqDel));
  });
}

function getFilteredTests() {
  const search = (document.getElementById('testSearch')?.value || '').toLowerCase();
  const type = document.getElementById('testFilterType')?.value || '';
  const status = document.getElementById('testFilterStatus')?.value || '';
  const reqId = document.getElementById('testFilterReq')?.value || '';

  let items = [...qaCache.tests];
  if (search) {
    items = items.filter((t) =>
      [t.test_id, t.title, t.description, t.req_ref].join(' ').toLowerCase().includes(search)
    );
  }
  if (type) items = items.filter((t) => t.test_type === type);
  if (status) items = items.filter((t) => t.status === status);
  if (reqId) items = items.filter((t) => t.requirement_id === reqId || t.req_ref === reqId);

  return items.sort((a, b) => a.test_id.localeCompare(b.test_id));
}

function renderQaTests() {
  const body = document.getElementById('testTableBody');
  if (!body) return;
  const items = getFilteredTests();
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun cas de test</td></tr>';
    return;
  }
  body.innerHTML = items.map((t) => {
    const req = qaCache.requirements.find((r) => r.id === t.requirement_id);
    const reqLabel = req?.req_id || t.req_ref || '—';
    return `
    <tr>
      <td><strong>${escapeHtml(t.test_id)}</strong></td>
      <td>${escapeHtml(reqLabel)}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>${QA_TEST_TYPE_LABELS[t.test_type] || t.test_type}</td>
      <td>${escapeHtml(t.priority)}</td>
      <td><span class="qa-status-pill ${t.status}">${QA_TEST_STATUS_LABELS[t.status] || t.status}</span></td>
      <td>${formatDateTime(t.last_run_at)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-dark" data-test-edit="${t.id}">Modifier</button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-test-del="${t.id}">Suppr.</button>
      </td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-test-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openTestModal(btn.dataset.testEdit));
  });
  body.querySelectorAll('[data-test-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteTest(btn.dataset.testDel));
  });
}

function renderQaTraceability() {
  const trace = computeQaTraceability(qaCache.requirements, qaCache.tests);
  const stats = computeQaGlobalStats(qaCache.requirements, qaCache.tests, qaCache.runs);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('traceCoverageGlobal', `${stats.globalCoverage}%`);
  set('traceTotalReqs', stats.totalReqs);
  set('traceTotalTests', stats.totalTests);
  set('tracePassed', stats.passed);
  set('traceFailed', stats.failed);

  const body = document.getElementById('traceTableBody');
  if (!body) return;
  body.innerHTML = trace.map((row) => `
    <tr>
      <td><strong>${escapeHtml(row.requirement.req_id)}</strong></td>
      <td>${escapeHtml(row.requirement.name)}</td>
      <td>${row.developed ? 'Oui' : 'Non'}</td>
      <td>${row.testCount}</td>
      <td>${row.coveragePct}%</td>
      <td class="${qaResultClass(row.result)}">${row.result}</td>
    </tr>
  `).join('');
}

function renderBarChart(hostId, rows) {
  const host = document.getElementById(hostId);
  if (!host) return;
  if (!rows?.length) {
    host.innerHTML = '<p class="form-note">Données insuffisantes</p>';
    return;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  host.innerHTML = rows.map((r) => `
    <div class="qa-bar-row">
      <span>${escapeHtml(r.label)}</span>
      <div class="qa-bar-track"><div class="qa-bar-fill ${r.cls || 'qa-bar-fill--cover'}" style="width:${Math.round((r.value / max) * 100)}%"></div></div>
      <strong>${r.value}</strong>
    </div>
  `).join('');
}

function renderQaReports() {
  const stats = computeQaGlobalStats(qaCache.requirements, qaCache.tests, qaCache.runs);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('reportTotal', stats.totalTests);
  set('reportOk', stats.passed);
  set('reportKo', stats.failed);
  set('reportCoverage', `${stats.functionalCoverage}%`);

  renderBarChart('chartSuccess', [
    { label: 'Succès', value: stats.passed, cls: 'qa-bar-fill--ok' },
    { label: 'Échecs', value: stats.failed, cls: 'qa-bar-fill--ko' },
    { label: 'Bloqués', value: stats.blocked, cls: 'qa-bar-fill--cover' },
    { label: 'En attente', value: stats.pending, cls: 'qa-bar-fill--cover' }
  ]);

  renderBarChart('chartCoverage', [
    { label: 'Exig. couvertes', value: stats.withTests },
    { label: 'Développées', value: stats.developed },
    { label: 'Validées', value: stats.validated },
    { label: 'Total exig.', value: stats.totalReqs }
  ]);

  const alerts = detectQaGaps(qaCache.requirements, qaCache.tests);
  const byType = { 'no-tests': 0, 'not-validated': 0, failed: 0, 'orphan-test': 0 };
  alerts.forEach((a) => { byType[a.type] = (byType[a.type] || 0) + 1; });
  renderBarChart('chartAnomalies', [
    { label: 'Sans tests', value: byType['no-tests'] || 0, cls: 'qa-bar-fill--ko' },
    { label: 'Non validées', value: byType['not-validated'] || 0 },
    { label: 'Échecs', value: byType.failed || 0, cls: 'qa-bar-fill--ko' },
    { label: 'Tests orphelins', value: byType['orphan-test'] || 0 }
  ]);

  const runsBody = document.getElementById('reportRunsBody');
  if (!runsBody) return;
  const runs = qaCache.runs.length ? qaCache.runs : qaReadLocalRuns();
  if (!runs.length) {
    runsBody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucune exécution enregistrée — lancez les tests depuis le dashboard.</td></tr>';
    return;
  }
  runsBody.innerHTML = runs.map((run) => `
    <tr>
      <td>${formatDateTime(run.started_at || run.startedAt)}</td>
      <td>${escapeHtml(run.status)}</td>
      <td>${run.total_tests ?? run.results?.stats?.total ?? '—'}</td>
      <td>${run.passed_tests ?? run.results?.stats?.passed ?? '—'}</td>
      <td>${run.failed_tests ?? run.results?.stats?.failed ?? '—'}</td>
      <td>${run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : run.results?.stats?.duration ? `${(run.results.stats.duration / 1000).toFixed(1)}s` : '—'}</td>
      <td>${run.success_rate != null ? `${run.success_rate}%` : '—'}</td>
    </tr>
  `).join('');
}

function qaReadLocalRuns() {
  try {
    return JSON.parse(localStorage.getItem('hb_qa_test_runs') || '[]');
  } catch { return []; }
}

function qaSaveLocalRun(run) {
  const runs = qaReadLocalRuns();
  runs.unshift(run);
  localStorage.setItem('hb_qa_test_runs', JSON.stringify(runs.slice(0, 50)));
}

function populateQaFilters() {
  const statusSel = document.getElementById('reqFilterStatus');
  if (statusSel && statusSel.options.length <= 1) {
    Object.entries(QA_DEV_STATUS_LABELS).forEach(([k, v]) => {
      statusSel.innerHTML += `<option value="${k}">${v}</option>`;
    });
  }
  const cats = [...new Set(qaCache.requirements.map((r) => r.category).filter(Boolean))];
  const catSel = document.getElementById('reqFilterCategory');
  if (catSel) {
    const cur = catSel.value;
    catSel.innerHTML = '<option value="">Toutes catégories</option>' +
      cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    catSel.value = cur;
  }
  const testStatusSel = document.getElementById('testFilterStatus');
  if (testStatusSel && testStatusSel.options.length <= 1) {
    Object.entries(QA_TEST_STATUS_LABELS).forEach(([k, v]) => {
      testStatusSel.innerHTML += `<option value="${k}">${v}</option>`;
    });
  }
  const testReqSel = document.getElementById('testFilterReq');
  const testReqSelect = document.getElementById('testReqSelect');
  [testReqSel, testReqSelect].forEach((sel) => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Sélectionner —</option>' +
      qaCache.requirements.map((r) =>
        `<option value="${r.id}" data-req="${r.req_id}">${escapeHtml(r.req_id)} — ${escapeHtml(r.name)}</option>`
      ).join('');
    if (cur) sel.value = cur;
  });
}

function openReqModal(id = null) {
  qaEditingReqId = id;
  const form = document.getElementById('reqForm');
  const title = document.getElementById('reqModalTitle');
  if (!form) return;
  form.reset();
  if (id) {
    const r = qaCache.requirements.find((x) => x.id === id);
    if (!r) return;
    title.textContent = `Modifier ${r.req_id}`;
    form.id.value = r.id;
    form.req_id.value = r.req_id;
    form.name.value = r.name;
    form.description.value = r.description || '';
    form.priority.value = r.priority;
    form.category.value = r.category;
    form.dev_status.value = r.dev_status;
    form.owner.value = r.owner || '';
  } else {
    title.textContent = 'Nouvelle exigence';
    form.req_id.value = qaNextIdLocal('REQ', qaCache.requirements, 'req_id');
  }
  qaOpenModal('reqModal');
}

function qaNextIdLocal(prefix, items, field) {
  const nums = items.map((i) => parseInt(String(i[field]).split('-')[1], 10)).filter((n) => !Number.isNaN(n));
  return `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

async function deleteReq(id) {
  if (!confirm('Supprimer cette exigence ?')) return;
  try {
    await deleteQaRequirement(id);
    await qaReloadAll();
    showAlert(document.getElementById('reqNote'), 'Exigence supprimée.', 'success');
  } catch (err) {
    showAlert(document.getElementById('reqNote'), err.message);
  }
}

function openTestModal(id = null) {
  qaEditingTestId = id;
  populateQaFilters();
  const form = document.getElementById('testForm');
  const title = document.getElementById('testModalTitle');
  if (!form) return;
  form.reset();
  if (id) {
    const t = qaCache.tests.find((x) => x.id === id);
    if (!t) return;
    title.textContent = `Modifier ${t.test_id}`;
    form.id.value = t.id;
    form.test_id.value = t.test_id;
    form.requirement_id.value = t.requirement_id || '';
    form.title.value = t.title;
    form.description.value = t.description || '';
    form.preconditions.value = t.preconditions || '';
    form.steps.value = t.steps || '';
    form.expected_result.value = t.expected_result || '';
    form.test_type.value = t.test_type;
    form.priority.value = t.priority;
    form.status.value = t.status;
    form.playwright_file.value = t.playwright_file || '';
  } else {
    title.textContent = 'Nouveau cas de test';
    form.test_id.value = qaNextIdLocal('TEST', qaCache.tests, 'test_id');
    form.status.value = 'non_execute';
  }
  qaOpenModal('testModal');
}

async function deleteTest(id) {
  if (!confirm('Supprimer ce cas de test ?')) return;
  try {
    await deleteQaTestCase(id);
    await qaReloadAll();
    showAlert(document.getElementById('testNote'), 'Test supprimé.', 'success');
  } catch (err) {
    showAlert(document.getElementById('testNote'), err.message);
  }
}

function exportRequirementsPdf() {
  const items = getFilteredRequirements();
  const rows = items.map((r) => `
    <tr>
      <td>${escapeHtml(r.req_id)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.description || '')}</td>
      <td>${escapeHtml(r.priority)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td>${QA_DEV_STATUS_LABELS[r.dev_status] || ''}</td>
      <td>${escapeHtml(r.owner || '')}</td>
    </tr>
  `).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Exigences HB Commerce</title>
  <style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#1e3320}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px}th{background:#f4f6f4}</style></head>
  <body><h1>HB Commerce — Exigences</h1><p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
  <table><thead><tr><th>ID</th><th>Nom</th><th>Description</th><th>Priorité</th><th>Catégorie</th><th>Statut</th><th>Responsable</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}

function exportRequirementsExcel() {
  const items = getFilteredRequirements();
  const header = ['ID', 'Nom', 'Description', 'Priorité', 'Catégorie', 'Statut', 'Responsable', 'Création', 'Modification'];
  const lines = [header.join(';')];
  items.forEach((r) => {
    lines.push([
      r.req_id, r.name, (r.description || '').replace(/;/g, ','),
      r.priority, r.category, QA_DEV_STATUS_LABELS[r.dev_status] || r.dev_status,
      r.owner || '', r.created_at || '', r.updated_at || ''
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'));
  });
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hb-commerce-exigences-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showAlert(document.getElementById('reqNote'), 'Export Excel (CSV) téléchargé.', 'success');
}

async function runQaTests(mode = 'all') {
  const btnIds = ['runAllTestsBtn', 'runFailedTestsBtn', 'runCriticalTestsBtn'];
  const btns = btnIds.map((id) => document.getElementById(id)).filter(Boolean);
  const statusBox = document.getElementById('qaRunStatus');
  const msg = document.getElementById('qaRunMessage');
  const fill = document.getElementById('qaRunProgressFill');
  const statsEl = document.getElementById('qaRunStats');
  const logsEl = document.getElementById('qaRunLogs');

  const runConfig = getQaRunConfig(qaCache.tests, mode);
  if (mode === 'failed' && !runConfig.files.length && !runConfig.useLastFailed) {
    showAlert(msg, 'Aucun test en échec à relancer.', 'info');
    return;
  }
  if (mode === 'critical' && !runConfig.files.length) {
    showAlert(msg, 'Aucun test critique avec fichier Playwright configuré.', 'info');
    return;
  }

  btns.forEach((b) => { b.disabled = true; });
  if (statusBox) statusBox.hidden = false;
  const modeLabels = { all: 'tous les tests', failed: 'tests échoués', critical: 'tests critiques' };
  if (msg) msg.textContent = `Démarrage — ${modeLabels[mode] || mode}…`;
  if (fill) fill.style.width = '5%';
  if (logsEl) logsEl.textContent = '';

  try {
    const { jobId } = await startQaTestRun(runConfig);
    if (msg) msg.textContent = `Job ${jobId} — exécution en cours…`;

    const poll = async () => {
      const job = await getQaRunStatus(jobId);
      if (fill) fill.style.width = `${job.progress || 0}%`;
      if (msg) msg.textContent = job.message || job.status;
      if (logsEl && job.logs?.length) logsEl.textContent = job.logs.slice(-30).join('\n');

      if (['completed', 'completed_with_failures', 'failed'].includes(job.status)) {
        clearInterval(qaRunPollTimer);
        qaRunPollTimer = null;

        const r = job.results?.stats || {};
        const total = r.total || 0;
        const passed = r.passed || 0;
        const failed = r.failed || 0;
        const rate = total ? Math.round((passed / total) * 100) : 0;
        const duration = r.duration ? (r.duration / 1000).toFixed(1) : '—';

        if (statsEl) {
          statsEl.textContent = `Total: ${total} · OK: ${passed} · KO: ${failed} · Taux: ${rate}% · Durée: ${duration}s`;
        }

        if (job.results?.report) {
          await syncPlaywrightResultsToQa(job.results.report, jobId);
        }

        const funcCov = computeQaGlobalStats(qaCache.requirements, qaCache.tests).functionalCoverage;
        qaSaveLocalRun({
          id: jobId,
          started_at: job.startedAt,
          finished_at: job.finishedAt,
          status: job.status,
          total_tests: total,
          passed_tests: passed,
          failed_tests: failed,
          duration_ms: r.duration || 0,
          success_rate: rate,
          functional_coverage: funcCov,
          run_mode: mode,
          results: job.results
        });

        await qaReloadAll();
        btns.forEach((b) => { b.disabled = false; });
        showAlert(msg, job.status === 'completed' ? 'Tous les tests ont réussi.' : 'Exécution terminée — consultez les résultats.', job.status === 'completed' ? 'success' : 'error');
      }
    };

    await poll();
    qaRunPollTimer = setInterval(poll, 2000);
  } catch (err) {
    if (msg) showAlert(msg, err.message + ' — Lancez : npm run qa:server', 'error');
    btns.forEach((b) => { b.disabled = false; });
  }
}

async function runAllQaTests() {
  return runQaTests('all');
}

function bindQaShell() {
  document.querySelectorAll('.admin-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => qaShowTab(btn.dataset.tab));
  });

  const toggle = document.getElementById('qaSidebarToggle');
  const sidebar = document.getElementById('qaSidebar');
  toggle?.addEventListener('click', () => sidebar?.classList.toggle('is-open'));

  ['reqSearch', 'reqFilterStatus', 'reqFilterCategory', 'reqFilterPriority', 'reqSort'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderQaRequirements);
    document.getElementById(id)?.addEventListener('change', renderQaRequirements);
  });
  ['testSearch', 'testFilterType', 'testFilterStatus', 'testFilterReq'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderQaTests);
    document.getElementById(id)?.addEventListener('change', renderQaTests);
  });

  document.getElementById('addReqBtn')?.addEventListener('click', () => openReqModal());
  document.getElementById('addTestBtn')?.addEventListener('click', () => openTestModal());
  document.getElementById('exportReqPdfBtn')?.addEventListener('click', exportRequirementsPdf);
  document.getElementById('exportReqExcelBtn')?.addEventListener('click', exportRequirementsExcel);
  document.getElementById('runAllTestsBtn')?.addEventListener('click', () => runQaTests('all'));
  document.getElementById('runFailedTestsBtn')?.addEventListener('click', () => runQaTests('failed'));
  document.getElementById('runCriticalTestsBtn')?.addEventListener('click', () => runQaTests('critical'));

  document.getElementById('reqForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      req_id: fd.get('req_id'),
      name: fd.get('name'),
      description: fd.get('description'),
      priority: fd.get('priority'),
      category: fd.get('category'),
      dev_status: fd.get('dev_status'),
      owner: fd.get('owner')
    };
    try {
      await upsertQaRequirement(payload, qaEditingReqId || fd.get('id') || null);
      qaCloseModal('reqModal');
      await qaReloadAll();
      showAlert(document.getElementById('reqNote'), 'Exigence enregistrée.', 'success');
    } catch (err) {
      showAlert(document.getElementById('reqNote'), err.message);
    }
  });

  document.getElementById('testForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const reqId = fd.get('requirement_id');
    const req = qaCache.requirements.find((r) => r.id === reqId);
    const payload = {
      test_id: fd.get('test_id'),
      requirement_id: reqId || null,
      req_ref: req?.req_id || null,
      title: fd.get('title'),
      description: fd.get('description'),
      preconditions: fd.get('preconditions'),
      steps: fd.get('steps'),
      expected_result: fd.get('expected_result'),
      test_type: fd.get('test_type'),
      priority: fd.get('priority'),
      status: fd.get('status'),
      playwright_file: fd.get('playwright_file') || null
    };
    try {
      await upsertQaTestCase(payload, qaEditingTestId || fd.get('id') || null);
      qaCloseModal('testModal');
      await qaReloadAll();
      showAlert(document.getElementById('testNote'), 'Cas de test enregistré.', 'success');
    } catch (err) {
      showAlert(document.getElementById('testNote'), err.message);
    }
  });
}

async function initQaModule() {
  const session = await requireAdmin();
  if (!session) return;

  qaBindModals();
  bindQaShell();
  document.getElementById('logoutBtn')?.addEventListener('click', signOut);

  await qaReloadAll();
}

document.addEventListener('DOMContentLoaded', initQaModule);
