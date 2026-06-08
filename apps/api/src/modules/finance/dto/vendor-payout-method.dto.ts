import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VendorPayoutMethodType } from '@prisma/client';

export class UpsertVendorPayoutMethodDto {
  @IsEnum(VendorPayoutMethodType)
  type!: VendorPayoutMethodType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  swiftCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  transferInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  manualMethodLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  manualIdentifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  manualInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactDetail?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class RejectPayoutMethodDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
