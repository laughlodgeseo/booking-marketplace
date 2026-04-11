import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPropertyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  checklistJson?: string;
}
