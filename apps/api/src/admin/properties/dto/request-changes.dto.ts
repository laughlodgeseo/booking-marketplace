import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestChangesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  checklistJson?: string;
}
