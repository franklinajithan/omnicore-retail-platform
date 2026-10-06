import { IsString, IsOptional, IsArray } from 'class-validator';

export class ImportPreviewDto {
  @IsString()
  content!: string; // CSV content

  @IsOptional()
  @IsString()
  format?: 'csv';
}

export interface ImportRow {
  rowNumber: number;
  data: {
    itemCode?: string;
    barcode?: string;
    productName?: string;
    category?: string;
    brand?: string;
    manufacturer?: string;
    vat?: string;
    baseUnit?: string;
    weight?: string;
    caseSize?: string;
    supplier?: string;
    supplierCode?: string;
    supplierCost?: string;
    retailPrice?: string;
    storeCode?: string;
  };
  status: 'valid' | 'warning' | 'error';
  messages: Array<{
    type: 'error' | 'warning';
    field?: string;
    message: string;
  }>;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  rows: ImportRow[];
}

export class ExecuteImportDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  format?: 'csv';
}

export interface ImportExecutionResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
  details?: Array<{
    row: number;
    status: 'created' | 'updated' | 'skipped' | 'error';
    message?: string;
  }>;
}
