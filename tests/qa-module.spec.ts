import { test, expect } from '@playwright/test';
import { gotoPage } from './helpers';

test.describe('Module QA', () => {
  test('TEST-013 Page QA — structure', async ({ page }) => {
    test.skip(!(await gotoPage(page, '/qa.html')), 'qa.html indisponible');
    await page.waitForTimeout(1200);
    if (page.url().includes('login.html')) {
      await expect(page.locator('form').first()).toBeVisible();
      return;
    }
    await expect(page.locator('.qa-app, #panel-dashboard').first()).toBeAttached();
    await expect(page.locator('#qaKpiTotalReqs')).toBeVisible();
  });
});
