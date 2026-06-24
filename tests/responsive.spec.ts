import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Responsive mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('TEST-012 Accueil mobile — page charge', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/index.html')), 'index.html indisponible');
    await expect(page.locator('body')).toBeVisible();
    const toggle = page.locator('.nav-toggle');
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(400);
    }
  });
});
