import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsArray,
  IsUUID,
} from 'class-validator';

enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
}

export class CreateUserDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  authUserId?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  defaultStoreId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  storeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  defaultStoreId?: string;
}

export class AssignStoresDto {
  @IsArray()
  @IsUUID('4', { each: true })
  storeIds!: string[];
}

export class AssignRolesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
