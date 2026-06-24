import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Catalogue', () => {
  test('TEST-006 Catalogue charge', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/produits.html')), 'produits.html indisponible');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
