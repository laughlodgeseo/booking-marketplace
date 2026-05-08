import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateHoldDto {
  @Matches(ISO_DAY, { message: 'checkIn must be YYYY-MM-DD' })
  checkIn!: string;

  @Matches(ISO_DAY, { message: 'checkOut must be YYYY-MM-DD' })
  checkOut!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  ttlMinutes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  guests?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  adults?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  children?: number | null;
}
