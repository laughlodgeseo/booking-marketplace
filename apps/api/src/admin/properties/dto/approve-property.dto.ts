import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class ApprovePropertyDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  activationFee?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z]{3}$/)
  activationFeeCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Optional structured feedback snapshot (JSON string)
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  checklistJson?: string;
}
