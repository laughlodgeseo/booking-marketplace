import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthorizePaymentDto {
  @ApiProperty({ description: 'Booking ID to authorize payment for' })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.STRIPE,
    description: 'STRIPE is the only supported customer payment method.',
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
