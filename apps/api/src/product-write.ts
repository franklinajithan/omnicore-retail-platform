import { BadRequestException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

export type ProductWrite = {
  itemCode: string;
  name: string;
  baseUnit: string;
  status: ProductStatus;
  barcodes: { code: string; isPrimary: boolean }[];
  imageUrl: string | null;
  category: string | null;
  vatApplicable: boolean | null;
  caseSize: string | null;
  casePrice: string | null;
  eachPrice: string | null;
};

const allowed = new Set(['itemCode', 'name', 'baseUnit', 'status', 'barcodes', 'imageUrl', 'category', 'vatApplicable', 'caseSize', 'casePrice', 'eachPrice']);
function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException(`Invalid ${field}`);
  return value.trim();
}

/** Explicitly validated complete replacement; no mass-assignment of tenant/id. */
export function parseProductWrite(body: unknown): ProductWrite {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Product object required');
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(k => !allowed.has(k)))
    throw new BadRequestException('Unknown product field');
  const itemCode = requiredText(input.itemCode, 'itemCode', 64);
  const name = requiredText(input.name, 'name', 255);
  const baseUnit = requiredText(input.baseUnit, 'baseUnit', 32);
  if (input.status !== 'ACTIVE' && input.status !== 'INACTIVE')
    throw new BadRequestException('Invalid status');
  if (!Array.isArray(input.barcodes) || input.barcodes.length > 32)
    throw new BadRequestException('Invalid barcodes');
  const barcodes = input.barcodes.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new BadRequestException('Invalid barcode entry');
    const row = raw as Record<string, unknown>;
    if (Object.keys(row).some(k => !['code', 'isPrimary'].includes(k)) ||
        typeof row.isPrimary !== 'boolean')
      throw new BadRequestException('Invalid barcode entry');
    return { code: requiredText(row.code, 'barcode', 128), isPrimary: row.isPrimary };
  });
  if (new Set(barcodes.map(b => b.code)).size !== barcodes.length)
    throw new BadRequestException('Duplicate barcodes');
  if (barcodes.length && barcodes.filter(b => b.isPrimary).length !== 1)
    throw new BadRequestException('Exactly one primary barcode required');
  const optionalText = (value: unknown, label: string, max: number) => value == null || value === '' ? null : requiredText(value, label, max);
  const decimal = (value: unknown, label: string, scale: number) => {
    if (value == null || value === '') return null;
    const v = String(value);
    if (!Number.isFinite(Number(v)) || Number(v) < 0 || v.length > 20 || !new RegExp('^[0-9]+(?:[.][0-9]{1,' + scale + '})?$').test(v)) throw new BadRequestException('Invalid ' + label);
    return v;
  };
  const imageUrl = optionalText(input.imageUrl, 'image URL', 2048);
  if (imageUrl && !/^https:\/\/[^\s]+$/.test(imageUrl)) throw new BadRequestException('HTTPS image URL required');
  if (input.vatApplicable != null && typeof input.vatApplicable !== 'boolean') throw new BadRequestException('Invalid VAT applicability');
  const caseSize = decimal(input.caseSize, 'case size', 3);
  if (caseSize !== null && Number(caseSize) <= 0) throw new BadRequestException('Case size must be positive');
  return { itemCode, name, baseUnit, status: input.status, barcodes, imageUrl,
    category: optionalText(input.category, 'category', 128), vatApplicable: input.vatApplicable == null ? null : input.vatApplicable,
    caseSize, casePrice: decimal(input.casePrice, 'case price', 4), eachPrice: decimal(input.eachPrice, 'each price', 4) };
}
