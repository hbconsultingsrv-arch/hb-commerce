/**
 * API Module QA — Supabase + fallback localStorage
 */

const QA_LOCAL_REQ_KEY = 'hb_qa_requirements';
const QA_LOCAL_TEST_KEY = 'hb_qa_test_cases';
const QA_LOCAL_RUNS_KEY = 'hb_qa_test_runs';
const QA_LOCAL_EXEC_KEY = 'hb_qa_test_executions';
const QA_RUNNER_URL = window.HB_CONFIG?.qaRunnerUrl || 'http://localhost:3099';

const QA_DEV_STATUS_LABELS = {
  non_commence: 'Non commencé',
  en_cours: 'En cours',
  developpe: 'Développé',
  valide: 'Validé'
};

const QA_TEST_STATUS_LABELS = {
  non_execute: 'Non exécuté',
  succes: 'Succès',
  echec: 'Échec',
  bloque: 'Bloqué'
};

const QA_TEST_TYPE_LABELS = {
  manuel: 'Manuel',
  automatique: 'Automatique'
};

function qaReadLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function qaWriteLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function qaNow() {
  return new Date().toISOString();
}

function qaNextId(prefix, items, field) {
  const nums = items
    .map((i) => i[field])
    .filter(Boolean)
    .map((id) => parseInt(String(id).split('-')[1], 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

function qaSeedDefaultsIfEmpty() {
  if (qaReadLocal(QA_LOCAL_REQ_KEY).length) return;
  const reqs = [
    { id: crypto.randomUUID(), req_id: 'REQ-001', name: 'Connexion client', description: 'Auth Supabase', priority: 'Critique', category: 'Authentification', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-002', name: 'Inscription professionnelle', description: 'Wizard inscription', priority: 'Critique', category: 'Authentification', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-003', name: 'Catalogue produits B2B', description: 'Catalogue et prix', priority: 'Critique', category: 'Catalogue', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-004', name: 'Panier et checkout', description: 'Commande en ligne', priority: 'Critique', category: 'Commandes', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-005', name: 'Suivi de commande', description: 'Timeline livraison', priority: 'Haute', category: 'Commandes', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-006', name: 'Espace client', description: 'Compte et profil', priority: 'Haute', category: 'Espace client', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-007', name: 'Administration commandes', description: 'Back-office', priority: 'Haute', category: 'Administration', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-008', name: 'Gestion stock', description: 'Stock et alertes', priority: 'Haute', category: 'Stock', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-009', name: 'Multi-marchés FR/LU', description: 'Marchés', priority: 'Moyenne', category: 'International', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-010', name: 'Paiement Stripe / virement', description: 'Checkout paiement', priority: 'Haute', category: 'Paiement', dev_status: 'en_cours', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-011', name: 'Responsive mobile', description: 'UX mobile', priority: 'Haute', category: 'UX', dev_status: 'developpe', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), req_id: 'REQ-012', name: 'Module QA', description: 'Qualité', priority: 'Haute', category: 'Qualité', dev_status: 'en_cours', owner: 'HB Commerce', created_at: qaNow(), updated_at: qaNow() }
  ];
  qaWriteLocal(QA_LOCAL_REQ_KEY, reqs);

  const reqMap = Object.fromEntries(reqs.map((r) => [r.req_id, r.id]));
  const tests = [
    { id: crypto.randomUUID(), test_id: 'TEST-001', requirement_id: reqMap['REQ-001'], req_ref: 'REQ-001', title: 'Connexion valide', description: '', preconditions: 'Compte actif', steps: 'Login formulaire', expected_result: 'Redirection OK', test_type: 'automatique', priority: 'Critique', status: 'non_execute', playwright_file: 'auth.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-002', requirement_id: reqMap['REQ-001'], req_ref: 'REQ-001', title: 'Connexion invalide', description: '', preconditions: '', steps: 'Mauvais MDP', expected_result: 'Erreur affichée', test_type: 'automatique', priority: 'Critique', status: 'non_execute', playwright_file: 'auth.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-003', requirement_id: reqMap['REQ-001'], req_ref: 'REQ-001', title: 'Déconnexion', description: '', preconditions: 'Connecté', steps: 'Clic déconnexion', expected_result: 'Session terminée', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'auth.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-004', requirement_id: reqMap['REQ-002'], req_ref: 'REQ-002', title: 'Page inscription', description: '', preconditions: '', steps: 'Ouvrir register', expected_result: 'Formulaire visible', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'registration.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-005', requirement_id: reqMap['REQ-002'], req_ref: 'REQ-002', title: 'Validation champs', description: '', preconditions: '', steps: 'Submit vide', expected_result: 'Validation', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'registration.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-006', requirement_id: reqMap['REQ-003'], req_ref: 'REQ-003', title: 'Catalogue charge', description: '', preconditions: '', steps: 'produits.html', expected_result: 'Page OK', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'catalog.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-007', requirement_id: reqMap['REQ-004'], req_ref: 'REQ-004', title: 'Page panier', description: '', preconditions: '', steps: 'panier.html', expected_result: 'Page OK', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'orders.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-008', requirement_id: reqMap['REQ-005'], req_ref: 'REQ-005', title: 'Suivi protégé', description: '', preconditions: 'Déconnecté', steps: 'suivi-commande.html', expected_result: 'Redirect login', test_type: 'automatique', priority: 'Critique', status: 'non_execute', playwright_file: 'orders.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-009', requirement_id: reqMap['REQ-005'], req_ref: 'REQ-005', title: 'Structure suivi', description: '', preconditions: '', steps: 'Vérifier DOM', expected_result: 'Timeline visible', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'orders.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-010', requirement_id: reqMap['REQ-006'], req_ref: 'REQ-006', title: 'Compte protégé', description: '', preconditions: '', steps: 'compte.html', expected_result: 'Redirect login', test_type: 'automatique', priority: 'Critique', status: 'non_execute', playwright_file: 'dashboard.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-011', requirement_id: reqMap['REQ-006'], req_ref: 'REQ-006', title: 'Onglets compte', description: '', preconditions: '', steps: 'Navigation tabs', expected_result: 'Panels OK', test_type: 'automatique', priority: 'Moyenne', status: 'non_execute', playwright_file: 'dashboard.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-012', requirement_id: reqMap['REQ-011'], req_ref: 'REQ-011', title: 'Mobile accueil', description: '', preconditions: '375px', steps: 'Menu mobile', expected_result: 'Nav OK', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'responsive.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() },
    { id: crypto.randomUUID(), test_id: 'TEST-013', requirement_id: reqMap['REQ-012'], req_ref: 'REQ-012', title: 'QA admin', description: '', preconditions: 'Admin', steps: 'qa.html', expected_result: 'Dashboard QA', test_type: 'automatique', priority: 'Haute', status: 'non_execute', playwright_file: 'qa-module.spec.ts', last_run_at: null, created_at: qaNow(), updated_at: qaNow() }
  ];
  qaWriteLocal(QA_LOCAL_TEST_KEY, tests);
}

async function fetchQaRequirements() {
  qaSeedDefaultsIfEmpty();
  const sb = getSupabase();
  if (!sb) return qaReadLocal(QA_LOCAL_REQ_KEY);
  const { data, error } = await sb.from('qa_requirements').select('*').order('req_id', { ascending: true });
  if (error) {
    console.warn('QA requirements Supabase:', error.message);
    return qaReadLocal(QA_LOCAL_REQ_KEY);
  }
  if (data?.length) {
    qaWriteLocal(QA_LOCAL_REQ_KEY, data);
    return data;
  }
  return qaReadLocal(QA_LOCAL_REQ_KEY);
}

async function upsertQaRequirement(payload, id = null) {
  const sb = getSupabase();
  const now = qaNow();
  if (!sb) {
    const items = qaReadLocal(QA_LOCAL_REQ_KEY);
    if (id) {
      const idx = items.findIndex((r) => r.id === id);
      if (idx >= 0) items[idx] = { ...items[idx], ...payload, updated_at: now };
    } else {
      items.push({
        id: crypto.randomUUID(),
        req_id: payload.req_id || qaNextId('REQ', items, 'req_id'),
        created_at: now,
        updated_at: now,
        ...payload
      });
    }
    qaWriteLocal(QA_LOCAL_REQ_KEY, items);
    return items.find((r) => r.id === id) || items[items.length - 1];
  }
  if (id) {
    const { data, error } = await sb.from('qa_requirements').update({ ...payload, updated_at: now }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await sb.from('qa_requirements').insert({ ...payload, updated_at: now }).select().single();
  if (error) throw error;
  return data;
}

async function deleteQaRequirement(id) {
  const sb = getSupabase();
  if (!sb) {
    qaWriteLocal(QA_LOCAL_REQ_KEY, qaReadLocal(QA_LOCAL_REQ_KEY).filter((r) => r.id !== id));
    return;
  }
  const { error } = await sb.from('qa_requirements').delete().eq('id', id);
  if (error) throw error;
}

async function fetchQaTestCases() {
  qaSeedDefaultsIfEmpty();
  const sb = getSupabase();
  if (!sb) return qaReadLocal(QA_LOCAL_TEST_KEY);
  const { data, error } = await sb.from('qa_test_cases').select('*').order('test_id', { ascending: true });
  if (error) return qaReadLocal(QA_LOCAL_TEST_KEY);
  if (data?.length) {
    qaWriteLocal(QA_LOCAL_TEST_KEY, data);
    return data;
  }
  return qaReadLocal(QA_LOCAL_TEST_KEY);
}

async function upsertQaTestCase(payload, id = null) {
  const sb = getSupabase();
  const now = qaNow();
  if (!sb) {
    const items = qaReadLocal(QA_LOCAL_TEST_KEY);
    if (id) {
      const idx = items.findIndex((t) => t.id === id);
      if (idx >= 0) items[idx] = { ...items[idx], ...payload, updated_at: now };
    } else {
      items.push({
        id: crypto.randomUUID(),
        test_id: payload.test_id || qaNextId('TEST', items, 'test_id'),
        created_at: now,
        updated_at: now,
        status: 'non_execute',
        ...payload
      });
    }
    qaWriteLocal(QA_LOCAL_TEST_KEY, items);
    return items.find((t) => t.id === id) || items[items.length - 1];
  }
  if (id) {
    const { data, error } = await sb.from('qa_test_cases').update({ ...payload, updated_at: now }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await sb.from('qa_test_cases').insert({ ...payload, updated_at: now }).select().single();
  if (error) throw error;
  return data;
}

async function deleteQaTestCase(id) {
  const sb = getSupabase();
  if (!sb) {
    qaWriteLocal(QA_LOCAL_TEST_KEY, qaReadLocal(QA_LOCAL_TEST_KEY).filter((t) => t.id !== id));
    return;
  }
  const { error } = await sb.from('qa_test_cases').delete().eq('id', id);
  if (error) throw error;
}

async function fetchQaTestRuns() {
  const sb = getSupabase();
  if (!sb) return qaReadLocal(QA_LOCAL_RUNS_KEY);
  const { data, error } = await sb.from('qa_test_runs').select('*').order('started_at', { ascending: false }).limit(50);
  if (error) return qaReadLocal(QA_LOCAL_RUNS_KEY);
  return data || [];
}

async function fetchQaExecutions(runId = null) {
  const sb = getSupabase();
  if (!sb) {
    const all = qaReadLocal(QA_LOCAL_EXEC_KEY);
    return runId ? all.filter((e) => e.run_id === runId) : all;
  }
  let q = sb.from('qa_test_executions').select('*').order('executed_at', { ascending: false });
  if (runId) q = q.eq('run_id', runId);
  const { data, error } = await q.limit(200);
  if (error) return qaReadLocal(QA_LOCAL_EXEC_KEY);
  return data || [];
}

function computeQaTraceability(requirements, testCases) {
  return requirements.map((req) => {
    const linked = testCases.filter((t) => t.requirement_id === req.id || t.req_ref === req.req_id);
    const executed = linked.filter((t) => t.status !== 'non_execute');
    const passed = linked.filter((t) => t.status === 'succes');
    const failed = linked.filter((t) => t.status === 'echec');
    const developed = ['developpe', 'valide'].includes(req.dev_status);
    const coveragePct = linked.length
      ? Math.round((executed.length / linked.length) * 100)
      : 0;
    let result = 'Non couvert';
    if (!linked.length) result = 'Non couvert';
    else if (failed.length) result = 'KO';
    else if (passed.length === linked.length && linked.length) result = 'OK';
    else if (executed.length) result = 'Partiel';
    else result = 'En attente';

    return {
      requirement: req,
      developed,
      testCount: linked.length,
      executedCount: executed.length,
      passedCount: passed.length,
      failedCount: failed.length,
      coveragePct,
      result,
      tests: linked
    };
  });
}

function computeQaGlobalStats(requirements, testCases, runs = []) {
  const trace = computeQaTraceability(requirements, testCases);
  const totalReqs = requirements.length;
  const developed = requirements.filter((r) => ['developpe', 'valide'].includes(r.dev_status)).length;
  const validated = requirements.filter((r) => r.dev_status === 'valide').length;
  const withTests = trace.filter((t) => t.testCount > 0).length;
  const globalCoverage = totalReqs ? Math.round((withTests / totalReqs) * 100) : 0;
  const functionalCoverage = totalReqs
    ? Math.round(trace.reduce((s, t) => s + t.coveragePct, 0) / totalReqs)
    : 0;

  const passed = testCases.filter((t) => t.status === 'succes').length;
  const failed = testCases.filter((t) => t.status === 'echec').length;
  const blocked = testCases.filter((t) => t.status === 'bloque').length;
  const pending = testCases.filter((t) => t.status === 'non_execute').length;

  return {
    totalReqs,
    developed,
    validated,
    withTests,
    globalCoverage,
    functionalCoverage,
    totalTests: testCases.length,
    passed,
    failed,
    blocked,
    pending,
    successRate: testCases.length
      ? Math.round((passed / testCases.length) * 100)
      : 0,
    lastRun: runs[0] || null
  };
}

function detectQaGaps(requirements, testCases) {
  const alerts = [];
  const reqIds = new Set(requirements.map((r) => r.id));
  const trace = computeQaTraceability(requirements, testCases);

  trace.forEach((row) => {
    const req = row.requirement;
    if (!row.testCount) {
      alerts.push({ type: 'no-tests', severity: 'warning', message: `${req.req_id} n'est couverte par aucun test.` });
    }
    if (row.developed && req.dev_status !== 'valide') {
      alerts.push({ type: 'not-validated', severity: 'info', message: `${req.req_id} est développée mais non validée.` });
    }
    if (row.failedCount) {
      alerts.push({ type: 'failed', severity: 'error', message: `${req.req_id} : ${row.failedCount} test(s) en échec.` });
    }
  });

  testCases.forEach((t) => {
    if (!t.requirement_id && !t.req_ref) {
      alerts.push({ type: 'orphan-test', severity: 'warning', message: `${t.test_id} n'est associé à aucune exigence.` });
    }
    if (t.req_ref && !requirements.some((r) => r.req_id === t.req_ref)) {
      alerts.push({ type: 'bad-ref', severity: 'error', message: `${t.test_id} référence ${t.req_ref} inexistante.` });
    }
    if (t.requirement_id && !reqIds.has(t.requirement_id)) {
      alerts.push({ type: 'bad-ref', severity: 'error', message: `${t.test_id} référence une exigence supprimée.` });
    }
  });

  return alerts;
}

async function syncPlaywrightResultsToQa(report, runId = null) {
  const testCases = await fetchQaTestCases();
  const now = qaNow();
  const executions = [];
  const suites = report.suites || [];

  function walkSuites(suite, file = '') {
    const f = suite.file || file;
    (suite.specs || []).forEach((spec) => {
      (spec.tests || []).forEach((test) => {
        const result = test.results?.[0];
        const title = spec.title || test.title;
        const matched = testCases.find((tc) =>
          title.includes(tc.test_id) ||
          (tc.playwright_file && f.includes(tc.playwright_file.replace('.spec.ts', '')))
        ) || testCases.find((tc) => title.toLowerCase().includes(tc.title.toLowerCase().slice(0, 12)));

        if (matched) {
          matched.status = result?.status === 'passed' ? 'succes' : result?.status === 'skipped' ? 'bloque' : 'echec';
          matched.last_run_at = now;
          executions.push({
            id: crypto.randomUUID(),
            run_id: runId,
            test_case_id: matched.id,
            test_id: matched.test_id,
            status: matched.status,
            duration_ms: result?.duration || 0,
            error_message: result?.error?.message || null,
            executed_at: now
          });
        }
      });
    });
    (suite.suites || []).forEach((s) => walkSuites(s, f));
  }

  suites.forEach((s) => walkSuites(s));

  const sb = getSupabase();
  if (sb) {
    for (const tc of testCases) {
      if (tc.last_run_at === now) {
        await sb.from('qa_test_cases').update({ status: tc.status, last_run_at: tc.last_run_at }).eq('id', tc.id);
      }
    }
    if (executions.length) {
      await sb.from('qa_test_executions').insert(executions);
    }
  } else {
    qaWriteLocal(QA_LOCAL_TEST_KEY, testCases);
    const allExec = qaReadLocal(QA_LOCAL_EXEC_KEY);
    qaWriteLocal(QA_LOCAL_EXEC_KEY, [...executions, ...allExec]);
  }

  return { updated: testCases.filter((t) => t.last_run_at === now).length, executions };
}

async function startQaTestRun(userId = null) {
  const res = await fetch(`${QA_RUNNER_URL}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Runner indisponible (${res.status})`);
  }
  return res.json();
}

async function getQaRunStatus(jobId) {
  const res = await fetch(`${QA_RUNNER_URL}/api/status/${jobId}`);
  if (!res.ok) throw new Error('Statut indisponible');
  return res.json();
}

window.QA_DEV_STATUS_LABELS = QA_DEV_STATUS_LABELS;
window.QA_TEST_STATUS_LABELS = QA_TEST_STATUS_LABELS;
window.QA_TEST_TYPE_LABELS = QA_TEST_TYPE_LABELS;
window.QA_RUNNER_URL = QA_RUNNER_URL;
window.fetchQaRequirements = fetchQaRequirements;
window.upsertQaRequirement = upsertQaRequirement;
window.deleteQaRequirement = deleteQaRequirement;
window.fetchQaTestCases = fetchQaTestCases;
window.upsertQaTestCase = upsertQaTestCase;
window.deleteQaTestCase = deleteQaTestCase;
window.fetchQaTestRuns = fetchQaTestRuns;
window.fetchQaExecutions = fetchQaExecutions;
window.computeQaTraceability = computeQaTraceability;
window.computeQaGlobalStats = computeQaGlobalStats;
window.detectQaGaps = detectQaGaps;
window.syncPlaywrightResultsToQa = syncPlaywrightResultsToQa;
window.startQaTestRun = startQaTestRun;
window.getQaRunStatus = getQaRunStatus;
