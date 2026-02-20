import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const SUPPORTED_CURRENCIES = ['AED', 'USD', 'SAR', 'EUR', 'GBP'] as const;

export class ReserveRequestDto {
  @Matches(ISO_DAY, { message: 'checkIn must be YYYY-MM-DD' })
  checkIn!: string;

  @Matches(ISO_DAY, { message: 'checkOut must be YYYY-MM-DD' })
  checkOut!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  guests?: number | null;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  ttlMinutes?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}
