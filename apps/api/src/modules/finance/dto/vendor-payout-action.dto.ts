import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PayoutNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerRef?: string;
}

export class PayoutDisputeDto {
  @IsString()
  @MaxLength(500)
  note!: string;
}

export class AdminMarkPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerRef?: string;
}
