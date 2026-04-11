import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PropertyDocumentType,
  PropertyMediaCategory,
  PropertyType,
} from '@prisma/client';

export type PropertyTranslationInput = {
  title?: string;
  description?: string | null;
  areaLabel?: string | null;
  tagline?: string | null;
};

export type PropertyTranslationsInput = Partial<
  Record<'en' | 'ar', PropertyTranslationInput>
>;

export class CreatePropertyDto {
  @IsString()
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

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

  // operational settings
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

  @IsOptional()
  @IsObject()
  translations?: PropertyTranslationsInput;
}

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

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

  // allow null explicitly for detach semantics
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

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

  // operational settings
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

export class ReorderMediaDto {
  @IsArray()
  @IsString({ each: true })
  orderedMediaIds!: string[];
}

/**
 * ✅ V1: Media categorization (your chosen option)
 * PATCH /vendor/properties/:propertyId/media/:mediaId
 */
export class UpdateMediaCategoryDto {
  @IsEnum(PropertyMediaCategory)
  category!: PropertyMediaCategory;
}

/**
 * ✅ V1: Property document upload metadata
 * POST /vendor/properties/:id/documents  (multipart)
 */
export class UploadPropertyDocumentDto {
  @IsEnum(PropertyDocumentType)
  type!: PropertyDocumentType;
}

/**
 * ✅ V3: Amenities selector (catalog-driven)
 * POST /vendor/properties/:id/amenities
 */
export class SetPropertyAmenitiesDto {
  @IsArray()
  @IsString({ each: true })
  amenityIds!: string[];
}

export class RequestPropertyDeletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
