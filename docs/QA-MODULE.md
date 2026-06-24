# Module QA — HB Commerce

Système complet de gestion des exigences, couverture de tests et automatisation QA.

## Composants

| Élément | Fichier |
|---------|---------|
| Interface QA | `qa.html` |
| API données | `js/qa-api.js` |
| Interface | `js/qa-main.js` |
| Styles | `css/qa-shell.css` |
| Schéma BDD | `supabase/migration-qa-management.sql` |
| Données initiales | `supabase/seed-qa-data.sql` |
| Tests Playwright | `tests/*.spec.ts` |
| Runner Node | `qa-runner/server.mjs` |

## Installation

```bash
npm install
npx playwright install chromium
```

### Supabase

1. Exécuter `supabase/migration-qa-management.sql`
2. Exécuter `supabase/seed-qa-data.sql`

### Configuration

Dans `js/config.js` :

```javascript
window.HB_CONFIG = {
  // ...
  qaRunnerUrl: 'http://localhost:3099'
};
```

## Utilisation

1. Servir le site : `npm run serve` (port 8080)
2. Démarrer le runner QA : `npm run qa:server` (port 3099)
3. Ouvrir `qa.html` (accès admin requis)
4. Cliquer **Exécuter tous les tests**

### Ligne de commande

```bash
npm test
npm run qa:run
npm run test:report
```

## Modules

- **Dashboard** — KPIs, alertes de couverture, exécution Playwright
- **Exigences** — CRUD, filtres, export PDF/Excel
- **Plan de test** — cas manuels/automatiques liés aux exigences
- **Traçabilité** — matrice REQ ↔ TEST avec couverture
- **Rapports** — graphiques et historique d'exécutions

## Fallback localStorage

Sans Supabase configuré, les données QA sont stockées dans `localStorage` pour démonstration.
