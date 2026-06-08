import { Module } from '@nestjs/common';
import { PropertyFeeService } from './property-fee.service';
import { PropertyFeePaymentService } from './property-fee-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripePaymentsProvider } from '../payments/providers/stripe.provider';

@Module({
  providers: [PropertyFeeService, PropertyFeePaymentService, PrismaService, StripePaymentsProvider],
  exports: [PropertyFeeService, PropertyFeePaymentService],
})
export class FeesModule {}
