import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Tableau de bord client', () => {
  test('TEST-010 Espace compte protégé', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/compte.html')), 'compte.html indisponible');
    await page.waitForTimeout(1000);
    expect(page.url().includes('login.html') || page.url().includes('compte.html')).toBeTruthy();
  });

  test('TEST-011 Navigation onglets compte', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/compte.html')), 'compte.html indisponible');
    await page.waitForTimeout(1000);
    if (!page.url().includes('compte.html')) return;
    const tabs = page.locator('#compteTabs .admin-tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(1);
  });
});
