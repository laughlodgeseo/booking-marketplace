import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Booking ID to create a Stripe PaymentIntent for' })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}
