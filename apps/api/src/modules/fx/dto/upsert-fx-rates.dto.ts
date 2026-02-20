import { IsNumber, IsOptional, Matches, Min } from 'class-validator';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class UpsertFxRatesDto {
  @IsOptional()
  @Matches(ISO_DAY, { message: 'asOfDate must be YYYY-MM-DD' })
  asOfDate?: string;

  @IsNumber()
  @Min(0.000001)
  sar!: number;

  @IsNumber()
  @Min(0.000001)
  usd!: number;

  @IsNumber()
  @Min(0.000001)
  eur!: number;

  @IsNumber()
  @Min(0.000001)
  gbp!: number;
}
