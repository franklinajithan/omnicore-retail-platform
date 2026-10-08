import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { auditSupplierInvoice, type InvoiceAuditRow } from './invoice-audit';
import { calculateClaim, type ClaimLineInput } from './claims';

const MAX_LINES = 1000;
function validLines(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_LINES;
}

/** Calculation-only endpoints. No invoices or claims are saved or approved. */
@Controller('purchasing/v1/review')
export class PurchasingReviewController {
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
}
