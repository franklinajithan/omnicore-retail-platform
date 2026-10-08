import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { auditSupplierInvoice, type InvoiceAuditRow } from './invoice-audit';
import { calculateClaim, type ClaimLineInput } from './claims';
import { planCreditAllocation, type CreditAllocation, type ClaimCreditTotals } from './credit-allocation';
import { normalizeInvoiceRows, type RawInvoiceRow } from './invoice-import';
import { matchInvoiceImport } from './invoice-matching';
import type { CatalogueItem } from './delivery-matching';
import { PrismaService } from '../prisma.service';

const MAX_LINES = 1000;
function validLines(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_LINES;
}

/** Calculation-only endpoints. No invoices or claims are saved or approved. */
@Controller('purchasing/v1/review')
export class PurchasingReviewController {
  constructor(private readonly db: PrismaService) {}
  private authorize(token: string | undefined) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || token !== 'Bearer ' + secret) throw new UnauthorizedException('Head Office bearer token required');
  }

  @Post('invoice-preview')
  invoicePreview(
    @Headers('authorization') token: string | undefined,
    @Body() input: { received: InvoiceAuditRow[]; invoiced: InvoiceAuditRow[] },
  ) {
    this.authorize(token);
    if (!input || !Array.isArray(input.received) || !Array.isArray(input.invoiced) ||
      input.received.length > MAX_LINES || input.invoiced.length > MAX_LINES) {
      throw new BadRequestException('Expected received and invoiced arrays of at most 1000 lines each');
    }
    try {
      const differences = auditSupplierInvoice(input.received, input.invoiced);
      return { status: differences.length ? 'REVIEW_REQUIRED' : 'MATCHED', differences };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid invoice');
    }
  }

  @Post('claim-preview')
  claimPreview(
    @Headers('authorization') token: string | undefined,
    @Body() input: { lines: ClaimLineInput[] },
  ) {
    this.authorize(token);
    if (!input || !validLines(input.lines)) throw new BadRequestException('Expected 1 to 1000 claim lines');
    try {
      return { status: 'DRAFT_PREVIEW', ...calculateClaim(input.lines) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid claim');
    }
  }
  @Post('credit-preview')
  creditPreview(
    @Headers('authorization') token: string | undefined,
    @Body() input: { claim: ClaimCreditTotals; prior: CreditAllocation[]; incoming: CreditAllocation },
  ) {
    this.authorize(token);
    if (!input || !input.claim || !Array.isArray(input.prior) || input.prior.length > MAX_LINES || !input.incoming) {
      throw new BadRequestException('Claim totals, prior allocations and incoming credit required');
    }
    try {
      return { status: 'DRAFT_PREVIEW', ...planCreditAllocation(input.claim, input.prior, input.incoming) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid credit note');
    }
  }

  @Post('invoice-import-preview')
  invoiceImportPreview(
    @Headers('authorization') token: string | undefined,
    @Body() input: { rows: RawInvoiceRow[] },
  ) {
    this.authorize(token);
    if (!input || !validLines(input.rows)) throw new BadRequestException('Expected 1 to 1000 invoice rows');
    try {
      return { status: 'DRAFT_PREVIEW', rows: normalizeInvoiceRows(input.rows) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid invoice rows');
    }
  }

  @Post('invoice-match-preview')
  invoiceMatchPreview(
    @Headers('authorization') token: string | undefined,
    @Body() input: { catalogue: CatalogueItem[]; rows: RawInvoiceRow[] },
  ) {
    this.authorize(token);
    if (!input || !validLines(input.rows) || !Array.isArray(input.catalogue) || input.catalogue.length > 10000) {
      throw new BadRequestException('Expected catalogue and 1 to 1000 invoice rows');
    }
    try {
      const rows = matchInvoiceImport(input.catalogue, input.rows);
      return {
        status: rows.every(row => row.status === 'MATCHED') ? 'MATCHED' : 'REVIEW_REQUIRED',
        rows,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid invoice matching request');
    }
  }

  /**
   * Server-resolved supplier catalogue. Caller cannot substitute arbitrary
   * product mappings. Full user-level RBAC is required before deployment.
   */
  @Post('supplier-invoice-match-preview')
  async supplierInvoiceMatchPreview(
    @Headers('authorization') token: string | undefined,
    @Body() input: { tenantId: string; supplierId: string; rows: RawInvoiceRow[] },
  ) {
    this.authorize(token);
    if (!input || typeof input.tenantId !== 'string' || !input.tenantId.trim() ||
        typeof input.supplierId !== 'string' || !input.supplierId.trim() ||
        !validLines(input.rows)) {
      throw new BadRequestException('tenantId, supplierId and 1 to 1000 rows required');
    }
    const supplier = await this.db.supplier.findFirst({
      where: { id: input.supplierId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!supplier) throw new BadRequestException('Supplier not found in tenant');
    const listings = await this.db.supplierProduct.findMany({
      where: { supplierId: supplier.id, product: { tenantId: input.tenantId } },
      select: {
        productId: true,
        supplierCode: true,
        product: {
          select: { tenantId: true, barcodes: { select: { code: true } } },
        },
      },
    });
    // Barcodes are resolved only through products belonging to the selected
    // tenant and the selected supplier's catalogue.
    const catalogue: CatalogueItem[] = listings.map(item => ({
      productId: item.productId,
      supplierCode: item.supplierCode,
      barcodes: item.product.barcodes.map(barcode => barcode.code),
    }));
    try {
      const rows = matchInvoiceImport(catalogue, input.rows);
      return {
        status: rows.every(row => row.status === 'MATCHED') ? 'MATCHED' : 'REVIEW_REQUIRED',
        barcodeMatchingEnabled: true,
        rows,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid invoice rows');
    }
  }

}
