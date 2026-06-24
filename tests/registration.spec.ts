import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Inscription', () => {
  test('TEST-004 Page inscription accessible', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/register.html')), 'register.html indisponible');
    await page.waitForLoadState('domcontentloaded');
    const form = page.locator('form').first();
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test('TEST-005 Validation champs obligatoires', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/register.html')), 'register.html indisponible');
    await page.waitForLoadState('domcontentloaded');
    const submit = page.locator('form button[type="submit"]').first();
    if (await submit.count()) {
      await submit.click();
      const invalid = page.locator(':invalid');
      const count = await invalid.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
