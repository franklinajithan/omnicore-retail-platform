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
  test('restores a store preference after switching stores and reloading', async ({ page }) => {
    await page.getByRole('button', { name: 'Columns' }).click();
    await page.getByRole('checkbox', { name: 'Barcode / EAN' }).uncheck();
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('omnicore-product-ag-grid-v2:Hounslow'))).toContain('"barcode":true');
    await page.locator('select.storeContext').selectOption('Hayes');
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toBeVisible();
    await page.locator('select.storeContext').selectOption('Hounslow');
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toHaveCount(0);
  });

  test('exports the selected store grid as CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('omnicore-products-hounslow.csv');
  });

  test('persists comfortable grid density across reload', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Grid density' }).click();
    await page.getByRole('option', { name: 'Comfortable' }).click();
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('omnicore-product-ag-grid-v2:Hounslow'))).toContain('"density":"standard"');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Grid density' })).toContainText('Comfortable');
  });

});
