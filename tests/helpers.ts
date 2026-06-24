import { test as base, expect } from '@playwright/test';

export async function gotoPage(page: import('@playwright/test').Page, path: string) {
  try {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!response || response.status() === 404) return false;
    return true;
  } catch {
    return false;
  }
}

export { expect, base as test };
