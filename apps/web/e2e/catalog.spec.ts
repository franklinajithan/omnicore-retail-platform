import { test, expect } from '@playwright/test';

test('CAT-001: homepage links to catalogue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /open product catalogue/i }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole('heading', { name: 'Product & Catalogue Management' })).toBeVisible();
});

test('CAT-004 CAT-003: creating product updates table and totals', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('QA Product');
  await page.getByText('SKU *').locator('input').fill('QA-001');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.getByRole('cell', { name: 'QA Product' })).toBeVisible();
  await expect(page.locator('section').first().getByText('4', { exact: true }).first()).toBeVisible();
});

test('CAT-005: required fields are validated', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.getByRole('alert')).toContainText('required');
});

test('CAT-006: duplicate SKU rejected', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('Another Milk');
  await page.getByText('SKU *').locator('input').fill('MILK-001');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.getByRole('alert')).toContainText('SKU already exists');
});

test('CAT-007: search filters products', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('textbox', { name: 'Search products' }).fill('BREAD-001');
  await expect(page.getByRole('cell', { name: 'Sourdough Bread' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Whole Milk 1L' })).toHaveCount(0);
});

test('CAT-012 CAT-013: category creation and duplicate rejection', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Categories' }).click();
  await page.getByRole('textbox', { name: 'New category name' }).fill('Frozen');
  await page.getByRole('button', { name: 'Add category' }).click();
  await expect(page.getByText('Frozen')).toBeVisible();
  await page.getByRole('textbox', { name: 'New category name' }).fill('frozen');
  await page.getByRole('button', { name: 'Add category' }).click();
  await expect(page.getByRole('alert')).toContainText('already exists');
});

test('CAT-014: manufacturer creation', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Manufacturers' }).click();
  await page.getByRole('textbox', { name: 'New manufacturer name' }).fill('QA Manufacturer');
  await page.getByRole('button', { name: 'Add manufacturer' }).click();
  await expect(page.getByText('QA Manufacturer')).toBeVisible();
});
