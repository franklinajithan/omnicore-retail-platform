import { test, expect } from '@playwright/test';

test.describe('Team 10 grid view lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('reset view restores the hidden barcode column', async ({ page }) => {
    await page.getByRole('button', { name: 'Columns' }).click();
    await page.getByRole('checkbox', { name: 'Barcode / EAN' }).uncheck();
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset view' }).click();
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toBeVisible();
  });

  test('column preference survives page reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Columns' }).click();
    await page.getByRole('checkbox', { name: 'Barcode / EAN' }).uncheck();
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('omnicore-product-ag-grid-v2:Hounslow'))).toContain('"barcode":true');
    await page.reload();
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toHaveCount(0);
  });
});
