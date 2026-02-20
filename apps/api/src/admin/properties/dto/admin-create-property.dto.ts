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

export class AdminCreatePropertyDto {
  /**
   * Optional: assign listing to a vendor user.
   * If omitted, it will be assigned to the admin userId (still a valid User FK).
   */
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsString()
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(80)
  city!: string;

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

  @IsInt()
  @Min(1)
  basePrice!: number;

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
  maxNights?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkInFromMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkInToMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkOutMin?: number;

  @IsOptional()
  @IsBoolean()
  isInstantBook?: boolean;

  /**
   * If true: create and set status=PUBLISHED (skips review entirely).
   * Otherwise: create as APPROVED (admin-approved) and admin can publish later.
   */
  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;

  @IsOptional()
  @IsObject()
  translations?: PropertyTranslationsInput;
}
