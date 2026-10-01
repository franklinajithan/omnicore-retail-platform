import { test, expect } from '@playwright/test';

test('CAT-001: homepage links to catalogue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /open product catalogue/i }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole('heading', { name: 'Product Catalogue' })).toBeVisible();
});

test('CAT-004 CAT-003: creating product updates table and totals', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('QA Product');
  await page.getByText('Item code (SKU) *').locator('input').fill('QA-001');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.getByText('QA Product').first()).toBeVisible();
  await expect(page.locator('section').first().getByText('4', { exact: true }).first()).toBeVisible();
});

test('CAT-005: required fields are validated', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('required');
});

test('CAT-006: duplicate SKU rejected', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('Another Milk');
  await page.getByText('Item code (SKU) *').locator('input').fill('MILK-001');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Item code / SKU already exists');
});

test('CAT-007: search filters products', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('textbox', { name: 'Search products' }).fill('BREAD-001');
  await expect(page.getByText('Sourdough Bread').first()).toBeVisible();
  await expect(page.getByText('Whole Milk 1L')).toHaveCount(0);
});

test('CAT-012 CAT-013: category creation and duplicate rejection', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Categories' }).click();
  await page.getByRole('textbox', { name: 'New category name' }).fill('Frozen');
  await page.getByRole('button', { name: 'Add category' }).click();
  await expect(page.getByText('Frozen')).toBeVisible();
  await page.getByRole('textbox', { name: 'New category name' }).fill('frozen');
  await page.getByRole('button', { name: 'Add category' }).click();
  await expect(page.locator('section').getByRole('alert')).toContainText('already exists');
});

test('CAT-014: manufacturer creation', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Manufacturers' }).click();
  await page.getByRole('textbox', { name: 'New manufacturer name' }).fill('QA Manufacturer');
  await page.getByRole('button', { name: 'Add manufacturer' }).click();
  await expect(page.getByText('QA Manufacturer')).toBeVisible();
});

test('MOB-001 MOB-002: mobile catalogue has app navigation and no horizontal page overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport only');
  await page.goto('/catalog');
  const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Products' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(nav.getByText('Scan')).toHaveAttribute('aria-disabled', 'true');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});

test('MOB-005: app manifest exposes standalone catalogue entry point', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/catalog');
});

test('MOB-009: overview home tab renders demo dashboard and links to catalogue', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();
  await expect(page.getByText('DEMO DATA · NOT LIVE')).toBeVisible();
  await page.getByRole('link', { name: /Product catalogue/ }).first().click();
  await expect(page).toHaveURL(/\/catalog$/);
});

test('MOB-010: mobile home bottom tab navigates between overview and products', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport only');
  await page.goto('/catalog');
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Products' }).click();
  await expect(page).toHaveURL(/\/catalog$/);
});

test('CAT-021: second barcode resolves to the same demo item', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('Multi Barcode Milk');
  await page.getByText('Item code (SKU) *').locator('input').fill('10542');
  await page.getByText('Primary barcode').locator('input').fill('5901234567890');
  await page.getByText('Additional barcodes (comma separated)').locator('input').fill('5901234567891');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await page.getByRole('textbox', { name: 'Search products' }).fill('5901234567891');
  await expect(page.getByText('Multi Barcode Milk').first()).toBeVisible();
});

test('CAT-022: a barcode cannot belong to two different items', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('First item');
  await page.getByText('Item code (SKU) *').locator('input').fill('10542');
  await page.getByText('Primary barcode').locator('input').fill('5901234567890');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByText('Product name *').locator('input').fill('Second item');
  await page.getByText('Item code (SKU) *').locator('input').fill('10543');
  await page.getByText('Primary barcode').locator('input').fill('5901234567890');
  await page.getByRole('button', { name: 'Add to demo catalogue' }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Barcode already belongs');
});

test('MOB-011: compact mobile product rows expand to reveal barcodes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport only');
  await page.goto('/catalog');
  const list = page.getByLabel('Compact product list');
  await expect(list).toBeVisible();
  await expect(page.locator('table')).toBeHidden();
  const row = list.getByRole('button', { name: /MILK-001/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(list.getByText('5901234123457')).toBeVisible();
});
