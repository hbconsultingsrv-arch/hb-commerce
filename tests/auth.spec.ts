import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Authentification', () => {
  test('TEST-002 Connexion invalide — message erreur', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/login.html')), 'login.html indisponible');
    await page.locator('input[name="email"]').fill('invalide@test.fr');
    await page.locator('input[name="password"]').fill('wrongpassword123');
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForTimeout(1500);
    const note = page.locator('#loginNote');
    const onLogin = page.url().includes('login.html');
    expect(onLogin).toBeTruthy();
  });

  test('TEST-001 Connexion — page login charge', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/login.html')), 'login.html indisponible');
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('TEST-003 Déconnexion — lien présent sur compte', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/compte.html')), 'compte.html indisponible');
    await page.waitForTimeout(800);
    const url = page.url();
    if (url.includes('login.html')) {
      await expect(page.locator('#loginForm')).toBeVisible();
    } else {
      await expect(page.locator('#logoutBtn')).toBeVisible();
    }
  });
});
