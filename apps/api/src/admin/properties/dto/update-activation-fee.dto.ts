import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateActivationFeeDto {
  @IsInt()
  @Min(1)
  activationFee!: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z]{3}$/)
  activationFeeCurrency?: string;
}
