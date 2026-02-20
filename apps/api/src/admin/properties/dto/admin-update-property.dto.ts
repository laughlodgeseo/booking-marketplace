import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { PropertyTranslationsInput } from '../../../vendor/vendor-properties.dto';

export class AdminUpdatePropertyDto {
  /**
   * Optional reassignment (admin can change which vendor owns it).
   * If null is sent, we DO NOT detach because vendorId is required in DB.
   */
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  basePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cleaningFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minNights?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxNights?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkInFromMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkInToMax?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkOutMin?: number | null;

  @IsOptional()
  @IsBoolean()
  isInstantBook?: boolean;

  @IsOptional()
  @IsObject()
  translations?: PropertyTranslationsInput;
}
