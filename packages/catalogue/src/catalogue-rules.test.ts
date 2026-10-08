import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScaledDecimal, normalizeBarcode, validateBarcodeUniqueness, unitCost } from './catalogue-rules.ts';
test('decimal quantities are exact', () => assert.equal(parseScaledDecimal('12.375', 3), 12375n));
test('reject excess precision', () => assert.throws(() => parseScaledDecimal('1.2345', 3)));
test('barcode normalization', () => assert.equal(normalizeBarcode(' 5901234123457 '), '5901234123457'));
test('reject duplicate product barcode', () => assert.throws(() => validateBarcodeUniqueness([{code:'12345678',level:'UNIT',unitsPerScan:'1'},{code:'12345678',level:'CASE',unitsPerScan:'12'}])));
test('supplier case cost conversion', () => assert.equal(unitCost({supplierId:'s',supplierCode:'c',caseSize:'12',caseCost:'13.2000',currency:'GBP'}), '1.1000'));
test('reject zero case size', () => assert.throws(() => unitCost({supplierId:'s',supplierCode:'c',caseSize:'0',caseCost:'13.2000',currency:'GBP'})));
