import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartVendorOnboardingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}
