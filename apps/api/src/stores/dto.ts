import { IsString, IsOptional, IsEnum, IsEmail } from 'class-validator';

enum StoreStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OPENING_SOON = 'OPENING_SOON',
  CLOSED = 'CLOSED',
}

enum StoreType {
  SUPERMARKET = 'SUPERMARKET',
  CONVENIENCE = 'CONVENIENCE',
  EXPRESS = 'EXPRESS',
  WAREHOUSE = 'WAREHOUSE',
  HEAD_OFFICE = 'HEAD_OFFICE',
}

export class CreateStoreDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;

  @IsOptional()
  @IsEnum(StoreType)
  storeType?: StoreType;

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
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;

  @IsOptional()
  @IsEnum(StoreType)
  storeType?: StoreType;

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
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
