import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentProvider, UserRole } from '@prisma/client';

import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import type { AuthRequest } from '../../auth/types/auth-request.type';

import { PaymentsService } from './payments.service';
import { AuthorizePaymentDto } from './dto/authorize-payment.dto';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

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
  async createIntent(
    @Body() body: { bookingId?: string | null },
    @Req() req: AuthRequest,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const user = req.user;

    console.log('🔥 Create PaymentIntent called');
    console.log('BODY:', body);

    try {
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }

      const bookingId =
        typeof body?.bookingId === 'string' ? body.bookingId.trim() : '';
      if (!bookingId) {
        throw new BadRequestException('bookingId is required');
      }

      const idempotencyKey = (idempotencyKeyHeader ?? '').trim() || null;

      return await this.payments.createStripeIntent({
        actor: { id: user.id, role: user.role },
        bookingId,
        idempotencyKey,
      });
    } catch (err) {
      console.error('❌ PaymentIntent Error:', err);
      throw err;
    }
  }

  @Post('capture')
  @Roles(UserRole.ADMIN)
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
