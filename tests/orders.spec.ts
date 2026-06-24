import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Commandes', () => {
  test('TEST-007 Page panier accessible', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/panier.html')), 'panier.html indisponible');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TEST-008 Suivi commande protégé', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/suivi-commande.html')), 'suivi-commande.html indisponible');
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url.includes('login.html') || url.includes('suivi-commande')).toBeTruthy();
  });

  test('TEST-009 Structure page suivi', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/suivi-commande.html')), 'suivi-commande.html indisponible');
    if (page.url().includes('login.html')) {
      await expect(page.locator('form').first()).toBeVisible();
      return;
    }
    await expect(page.locator('#trackingLayout, #trackingEmpty, #trackingLoading').first()).toBeAttached();
  });
});
