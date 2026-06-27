/**
 * Admin — affichage du rapport tests E2E (Construction du site)
 */

async function loadQaReport() {
  const host = document.getElementById('qaReportHost');
  if (!host) return;

  host.innerHTML = '<p class="empty-state">Chargement des tests E2E…</p>';

  try {
    const resp = await fetch(`tests/reports/latest.json?v=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderQaReport(host, data);
  } catch (err) {
    host.innerHTML = `<div class="qa-report-card qa-report-card--empty">
      <p class="empty-state">Rapport tests indisponible. Lancez <code>python tests/run_tests.py</code> ou attendez le CI GitHub Actions.</p>
      <p class="form-note">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function renderQaReport(host, data) {
  const s = data.summary || {};
  const total = s.total || 0;
  const passRate = s.pass_rate ?? 0;
  const statusClass = s.failed > 0 ? 'qa-report-card--fail' : (total && s.passed === total ? 'qa-report-card--ok' : 'qa-report-card--neutral');
  const generated = data.generated_at ? formatDate(data.generated_at) : '—';
  const tool = data.tool || 'selenium-python-pytest';
  const baseUrl = data.base_url || '—';

  const suiteRows = (data.suites || []).map((suite) => `
    <tr>
      <td>${escapeHtml(suite.name)}</td>
      <td>${suite.passed || 0}</td>
      <td>${suite.failed || 0}</td>
      <td>${suite.skipped || 0}</td>
      <td>${suite.total || 0}</td>
    </tr>
  `).join('') || '<tr><td colspan="5">Aucune suite exécutée.</td></tr>';

  const scenarioRows = (data.scenarios || []).slice(0, 20).map((row) => {
    const badge = row.status === 'passed' ? 'qa-status--pass'
      : row.status === 'failed' ? 'qa-status--fail' : 'qa-status--skip';
    return `<tr>
      <td><code>${escapeHtml(row.id || '—')}</code></td>
      <td>${escapeHtml(row.name || '—')}</td>
      <td><span class="qa-status-badge ${badge}">${escapeHtml(row.status)}</span></td>
      <td>${row.duration_ms || 0} ms</td>
    </tr>`;
  }).join('');

  const more = (data.scenarios || []).length > 20
    ? `<p class="form-note">+ ${data.scenarios.length - 20} scénario(s) — voir tests/reports/latest.json</p>`
    : '';

  host.innerHTML = `
    <div class="qa-report-card ${statusClass}">
      <div class="qa-report-head">
        <div>
          <h2>Tests E2E automatisés (Selenium Python)</h2>
          <p class="auth-sub" style="margin:0.35rem 0 0">
            Dernière exécution : ${generated} · ${tool} · cible : ${escapeHtml(baseUrl)}
            ${data.ci?.commit ? ` · commit ${escapeHtml(data.ci.commit)}` : ''}
          </p>
        </div>
        <div class="qa-report-pct" aria-label="Taux de réussite">${passRate}%</div>
      </div>
      <div class="qa-report-bar" role="progressbar" aria-valuenow="${passRate}" aria-valuemin="0" aria-valuemax="100">
        <div class="qa-report-bar-fill" style="width:${passRate}%"></div>
      </div>
      <div class="qa-report-stats">
        <div class="qa-report-stat"><strong>${s.passed || 0}</strong><span>Réussis</span></div>
        <div class="qa-report-stat"><strong>${s.failed || 0}</strong><span>Échoués</span></div>
        <div class="qa-report-stat"><strong>${s.skipped || 0}</strong><span>Ignorés</span></div>
        <div class="qa-report-stat"><strong>${total}</strong><span>Total</span></div>
        <div class="qa-report-stat"><strong>${Math.round(data.duration_seconds || 0)}s</strong><span>Durée</span></div>
      </div>
      <details class="qa-report-details" open>
        <summary>Par suite fonctionnelle</summary>
        <div class="table-wrap" style="margin-top:0.75rem">
          <table class="requests-table">
            <thead><tr><th>Suite</th><th>OK</th><th>KO</th><th>Skip</th><th>Total</th></tr></thead>
            <tbody>${suiteRows}</tbody>
          </table>
        </div>
      </details>
      ${scenarioRows ? `<details class="qa-report-details">
        <summary>Détail des scénarios</summary>
        <div class="table-wrap" style="margin-top:0.75rem">
          <table class="requests-table">
            <thead><tr><th>ID</th><th>Scénario</th><th>Statut</th><th>Durée</th></tr></thead>
            <tbody>${scenarioRows}</tbody>
          </table>
        </div>
        ${more}
      </details>` : ''}
      <p class="form-note" style="margin-top:0.85rem;margin-bottom:0">
        Relancer localement : <code>pip install -r requirements-test.txt</code> puis
        <code>python tests/run_tests.py</code> — scénarios documentés dans
        <a href="docs/TESTS-E2E-SCENARIOS.md" target="_blank" rel="noopener">docs/TESTS-E2E-SCENARIOS.md</a>
      </p>
    </div>
  `;
}

window.loadQaReport = loadQaReport;
