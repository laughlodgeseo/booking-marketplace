import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AdminCreatePayoutDto {
  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.MANUAL,
    description:
      'Payout provider. V1 uses MANUAL; later can add bank/etc.',
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    description:
      'Optional provider reference (bank transfer ref, etc). Can also be set when marking succeeded.',
  })
  @IsOptional()
  @IsString()
  providerRef?: string;
}
