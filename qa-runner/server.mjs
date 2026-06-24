/**
 * Serveur QA Runner — lance Playwright et expose statut / résultats
 * Démarrage : npm run qa:server (port 3099)
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { readFile, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.QA_RUNNER_PORT || 3099;

const app = express();
app.use(cors());
app.use(express.json());

const jobs = new Map();

function createJob() {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const job = {
    id,
    status: 'queued',
    progress: 0,
    message: "En file d'attente…",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    results: null,
    logs: []
  };
  jobs.set(id, job);
  return job;
}

function runPlaywright(job) {
  return new Promise((resolve) => {
    job.status = 'running';
    job.message = 'Exécution des tests Playwright…';
    job.progress = 10;

    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npx.cmd' : 'npx';
    const args = ['playwright', 'test', '--reporter=json,html', '--project=chromium'];

    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: isWin,
      env: { ...process.env, HB_SKIP_WEBSERVER: '1', CI: '1' }
    });

    let stdout = '';
    child.stdout.on('data', (d) => {
      const line = d.toString();
      stdout += line;
      job.logs.push(line.trim());
      if (job.logs.length > 200) job.logs.shift();
      if (job.progress < 90) job.progress += 2;
    });

    child.stderr.on('data', (d) => {
      const line = d.toString();
      job.logs.push(`[stderr] ${line.trim()}`);
    });

    child.on('close', async (code) => {
      job.progress = 95;
      job.message = 'Analyse des résultats…';

      let report = null;
      const jsonPath = path.join(ROOT, 'playwright-results.json');
      try {
        await access(jsonPath);
        const raw = await readFile(jsonPath, 'utf-8');
        report = JSON.parse(raw);
      } catch {
        job.logs.push('Rapport JSON non trouvé — tests peut-être partiellement exécutés.');
      }

      const stats = report?.stats || {};
      job.results = {
        exitCode: code,
        stats: {
          total: (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0),
          passed: stats.expected || 0,
          failed: stats.unexpected || 0,
          skipped: stats.skipped || 0,
          duration: stats.duration || 0
        },
        report,
        reportHtml: '/playwright-report/index.html'
      };
      job.status = code === 0 ? 'completed' : 'completed_with_failures';
      job.progress = 100;
      job.finishedAt = new Date().toISOString();
      job.message = code === 0 ? 'Tous les tests ont réussi.' : 'Exécution terminée avec des échecs.';
      resolve(job);
    });

    child.on('error', (err) => {
      job.status = 'failed';
      job.message = err.message;
      job.finishedAt = new Date().toISOString();
      resolve(job);
    });
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hb-commerce-qa-runner' });
});

app.post('/api/run', async (req, res) => {
  const running = [...jobs.values()].find((j) => j.status === 'running');
  if (running) {
    return res.status(409).json({ error: 'Une exécution est déjà en cours.', jobId: running.id });
  }

  const job = createJob();
  res.json({ jobId: job.id, status: job.status });

  runPlaywright(job).catch((err) => {
    job.status = 'failed';
    job.message = err.message;
    job.finishedAt = new Date().toISOString();
  });
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job introuvable' });
  res.json(job);
});

app.get('/api/jobs', (_req, res) => {
  res.json([...jobs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20));
});

app.use('/playwright-report', express.static(path.join(ROOT, 'playwright-report')));

app.listen(PORT, () => {
  console.log(`HB Commerce QA Runner → http://localhost:${PORT}`);
});
