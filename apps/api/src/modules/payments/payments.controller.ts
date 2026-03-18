import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentProvider, UserRole } from '@prisma/client';

import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';

import { PaymentsService } from './payments.service';
import { AuthorizePaymentDto } from './dto/authorize-payment.dto';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAccessGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('authorize')
  @Roles(UserRole.CUSTOMER)
  authorize(
    @CurrentUser() user: AuthUser,
    @Body() dto: AuthorizePaymentDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey = (idempotencyKeyHeader ?? '').trim() || null;

    return this.payments.authorize({
      actor: { id: user.id, role: user.role },
      bookingId: dto.bookingId,
      provider: dto.provider ?? PaymentProvider.STRIPE,
      idempotencyKey,
    });
  }

  @Post('create-intent')
  @Roles(UserRole.CUSTOMER)
  createIntent(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey = (idempotencyKeyHeader ?? '').trim() || null;

    return this.payments.createStripeIntent({
      actor: { id: user.id, role: user.role },
      bookingId: dto.bookingId,
      idempotencyKey,
    });
  }

  @Post('capture')
  @Roles(UserRole.CUSTOMER)
  capture(
    @CurrentUser() user: AuthUser,
    @Body() dto: CapturePaymentDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey = (idempotencyKeyHeader ?? '').trim() || null;

    return this.payments.capture({
      actor: { id: user.id, role: user.role },
      bookingId: dto.bookingId,
      idempotencyKey,
    });
  }

  @Post('refund/process')
  @Roles(UserRole.ADMIN)
  processRefund(
    @CurrentUser() user: AuthUser,
    @Body() dto: RefundPaymentDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey = (idempotencyKeyHeader ?? '').trim() || null;

    return this.payments.processRefund({
      actor: { id: user.id, role: user.role },
      refundId: dto.refundId,
      idempotencyKey,
      amountOverride: dto.amountOverride,
    });
  }
}
