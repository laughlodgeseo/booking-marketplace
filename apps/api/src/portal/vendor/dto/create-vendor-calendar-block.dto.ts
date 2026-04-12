import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateVendorCalendarBlockDto {
  @IsUUID()
  propertyId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be YYYY-MM-DD.',
  })
  startDate!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be YYYY-MM-DD.',
  })
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
