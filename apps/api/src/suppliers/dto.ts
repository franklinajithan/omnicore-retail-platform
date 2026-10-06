import { IsString, IsOptional, IsEnum, IsEmail, IsNumber } from 'class-validator';

enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class CreateSupplierDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  companyNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  orderEmail?: string;

  @IsOptional()
  @IsEmail()
  claimsEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  minimumOrder?: number;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  companyNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  orderEmail?: string;

  @IsOptional()
  @IsEmail()
  claimsEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  minimumOrder?: number;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}

export class CreateSupplierProductDto {
  @IsString()
  supplierId!: string;

  @IsString()
  productId!: string;

  @IsString()
  supplierProductCode!: string;

  @IsOptional()
  @IsString()
  supplierDescription?: string;

  @IsOptional()
  @IsString()
  supplierBarcode?: string;

  @IsNumber()
  caseSize!: number;

  @IsOptional()
  @IsNumber()
  minimumOrderQty?: number;

  @IsOptional()
  @IsNumber()
  orderMultiple?: number;

  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @IsNumber()
  currentUnitCost!: number;

  @IsNumber()
  currentCaseCost!: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  isPreferredSupplier?: boolean;

  @IsOptional()
  isActive?: boolean;
}

export class UpdateSupplierProductDto {
  @IsOptional()
  @IsString()
  supplierProductCode?: string;

  @IsOptional()
  @IsString()
  supplierDescription?: string;

  @IsOptional()
  @IsString()
  supplierBarcode?: string;

  @IsOptional()
  @IsNumber()
  caseSize?: number;

  @IsOptional()
  @IsNumber()
  minimumOrderQty?: number;

  @IsOptional()
  @IsNumber()
  orderMultiple?: number;

  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @IsOptional()
  @IsNumber()
  currentUnitCost?: number;

  @IsOptional()
  @IsNumber()
  currentCaseCost?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  isPreferredSupplier?: boolean;

  @IsOptional()
  isActive?: boolean;
}
