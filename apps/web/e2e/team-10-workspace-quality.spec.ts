import { test, expect } from '@playwright/test';

test.describe('Team 10 product workspace regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Products remains the root tab without Dashboard', async ({ page }) => {
    const tabs = page.locator('.workspaceTab');
    await expect(tabs.filter({ hasText: 'Products' })).toHaveCount(1);
    await expect(tabs.filter({ hasText: 'Dashboard' })).toHaveCount(0);
  });

  test('product detail tab can be closed with the keyboard', async ({ page }) => {
    await page.getByRole('row').filter({ hasText: 'MLEKPOL MASLO EXTRA 200G' }).dblclick();
    const tab = page.locator('.workspaceTab').filter({ hasText: '15953' });
    await expect(tab).toBeVisible();
    const close = tab.getByRole('button', { name: 'Close tab' });
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(tab).toHaveCount(0);
    await expect(page.locator('.workspaceTab').filter({ hasText: 'Products' })).toBeVisible();
  });

  test('mobile root workspace remains accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const products = page.locator('.workspaceTab').filter({ hasText: 'Products' });
    await expect(products).toBeVisible();
    await products.click();
    await expect(page.locator('.productListWorkspace')).toBeVisible();
  });
});

test.describe('Team 10 store-specific grid preferences', () => {
  test('hidden columns do not leak between stores', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('button', { name: 'Columns' }).click();
    await page.getByRole('checkbox', { name: 'Barcode / EAN' }).uncheck();
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toHaveCount(0);

    await page.locator('select.storeContext').selectOption('Hayes');
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toBeVisible();

    await page.locator('select.storeContext').selectOption('Hounslow');
    await expect(page.getByRole('columnheader', { name: 'Barcode / EAN' })).toHaveCount(0);
  });
});
