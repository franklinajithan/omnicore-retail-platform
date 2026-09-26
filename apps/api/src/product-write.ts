import { BadRequestException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

export type ProductWrite = {
  itemCode: string;
  name: string;
  baseUnit: string;
  status: ProductStatus;
  barcodes: { code: string; isPrimary: boolean }[];
};

const allowed = new Set(['itemCode', 'name', 'baseUnit', 'status', 'barcodes']);
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
  return { itemCode, name, baseUnit, status: input.status, barcodes };
}
