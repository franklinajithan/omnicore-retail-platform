import {test,expect} from '@playwright/test';

test.describe('OmniCore Chrome-like workspace tabs',()=>{
 test.beforeEach(async({page})=>{
  await page.goto('/products');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
 });

 test('opens products in independent tabs and restores screens/state',async({page})=>{
  const tabs=page.locator('.workspaceTab');
  await expect(tabs.filter({hasText:'Products'})).toBeVisible();
  await expect(tabs.filter({hasText:'Dashboard'})).toHaveCount(0);

  const search=page.getByPlaceholder(/Search 1,284,692 products/i);
  await search.fill('MLEKPOL');
  const milkRow=page.getByRole('row').filter({hasText:'MLEKPOL MASLO EXTRA 200G'});
  await milkRow.dblclick();

  const milkTab=tabs.filter({hasText:'15953'});
  await expect(milkTab).toBeVisible();
  await expect(page.getByRole('heading',{name:'MLEKPOL MASLO EXTRA 200G'})).toBeVisible();
  await expect(page.locator('.productListWorkspace')).toBeHidden();

  await tabs.filter({hasText:'Products'}).click();
  await expect(page.locator('.productListWorkspace')).toBeVisible();
  await expect(search).toHaveValue('MLEKPOL');

  await search.fill('KABANOS');
  const kabanosRow=page.getByRole('row').filter({hasText:'KABANOS KIELBASA DLA CHLOPA'});
  await kabanosRow.dblclick();

  const kabanosTab=tabs.filter({hasText:'17041'});
  await expect(kabanosTab).toBeVisible();
  await expect(page.getByRole('heading',{name:'KABANOS KIELBASA DLA CHLOPA'})).toBeVisible();

  await milkTab.click();
  await expect(page.getByRole('heading',{name:'MLEKPOL MASLO EXTRA 200G'})).toBeVisible();
  await kabanosTab.click();
  await expect(page.getByRole('heading',{name:'KABANOS KIELBASA DLA CHLOPA'})).toBeVisible();

  await tabs.filter({hasText:'Products'}).click();
  await expect(search).toHaveValue('KABANOS');

  await kabanosTab.getByRole('button',{name:'Close tab'}).click();
  await expect(kabanosTab).toHaveCount(0);
  await page.locator('.reopenTab').click();
  await expect(tabs.filter({hasText:'17041'})).toBeVisible();

  await page.reload();
  await expect(tabs.filter({hasText:'Products'})).toBeVisible();
  await expect(tabs.filter({hasText:'15953'})).toBeVisible();
  await expect(tabs.filter({hasText:'17041'})).toBeVisible();
 });

 test('single click remains a side preview, not a workspace tab',async({page})=>{
  const row=page.getByRole('row').filter({hasText:'MLEKPOL MASLO EXTRA 200G'});
  await row.click();
  await expect(page.locator('.detailPanel')).toBeVisible();
  await expect(page.locator('.detailPanel')).not.toHaveClass(/detailExpanded/);
  await expect(page.locator('.workspaceTab').filter({hasText:'15953'})).toHaveCount(0);
  await expect(page.locator('.expandDetail')).toBeVisible();
  await expect(page.locator('.closeDetail')).toBeVisible();
 });

 test('does not duplicate an already-open product tab',async({page})=>{
  const row=page.getByRole('row').filter({hasText:'MLEKPOL MASLO EXTRA 200G'});
  await row.dblclick();
  await page.locator('.workspaceTab').filter({hasText:'Products'}).click();
  await row.dblclick();
  await expect(page.locator('.workspaceTab').filter({hasText:'15953'})).toHaveCount(1);
 });
 test('product grid behaves like an operational spreadsheet',async({page})=>{
  const dataRows=page.locator('.MuiDataGrid-row'); const firstRow=dataRows.first();
  await page.getByRole('columnheader',{name:/stock/i}).click();
  await expect(page.getByRole('columnheader',{name:/stock/i})).toHaveAttribute('aria-sort','ascending');
  await page.getByRole('columnheader',{name:/stock/i}).click();
  await expect(page.getByRole('columnheader',{name:/stock/i})).toHaveAttribute('aria-sort','descending');

  await page.getByRole('button',{name:/Columns/}).click();
  const barcodeToggle=page.getByRole('checkbox',{name:'Barcode / EAN'});
  await barcodeToggle.uncheck();
  await expect(page.getByRole('columnheader',{name:/barcode/i})).toHaveCount(0);
  await barcodeToggle.check();
  await expect(page.getByRole('columnheader',{name:/barcode/i})).toBeVisible();

  await firstRow.click();
  await expect(firstRow).toHaveAttribute('aria-selected','true');
  await firstRow.press('ArrowDown');
  await expect(dataRows.nth(1)).toBeVisible();

  const milkGridRow=page.getByRole('row').filter({hasText:'MLEKPOL MASLO EXTRA 200G'}); await milkGridRow.focus();
  await milkGridRow.press('Enter');
  await expect(page.locator('.workspaceTab').filter({hasText:'15953'})).toHaveCount(1);
  await expect(page.getByRole('heading',{name:'MLEKPOL MASLO EXTRA 200G'})).toBeVisible();

  await page.locator('.workspaceTab').filter({hasText:'Products'}).click();
  await page.getByRole('button',{name:/Reset view/}).click();
  await expect(page.getByRole('columnheader',{name:/barcode/i})).toBeVisible();
 });

});

test.describe('OmniCore mobile product grid',()=>{
 test('mobile double tap opens a Chrome-style product workspace tab',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/products');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  const row=page.getByRole('row').filter({hasText:'MLEKPOL MASLO EXTRA 200G'});
  await row.click();
  await page.waitForTimeout(120);
  await row.click();
  await expect(page.locator('.workspaceTab').filter({hasText:'15953'})).toHaveCount(1);
  await expect(page.getByRole('heading',{name:'MLEKPOL MASLO EXTRA 200G'})).toBeVisible();
 });
});
