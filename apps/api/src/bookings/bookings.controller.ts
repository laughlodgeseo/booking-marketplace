// src/bookings/bookings.controller.ts
import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CreateBookingDto } from './booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingsService } from './bookings.service';

import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CUSTOMER_CAPABLE_ROLES } from '../common/rbac.constants';

@Controller('bookings')
@UseGuards(JwtAccessGuard, RolesGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(...CUSTOMER_CAPABLE_ROLES)
  async createBooking(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey =
      (dto.idempotencyKey ?? idempotencyKeyHeader ?? '').trim() || null;

    return this.bookingsService.createFromHold({
      userId: user.id,
      userRole: user.role,
      holdId: dto.holdId,
      idempotencyKey,
    });
  }

  // Customer-portal cancellation endpoint.
  // VENDOR-capable users (role === VENDOR) booking as guests are treated as
  // CUSTOMER here, since this endpoint represents the customer perspective.
  // Vendor-perspective cancellation (own property bookings) must go through
  // the vendor portal endpoint with an explicit VENDOR actor.
  @Post(':id/cancel')
  async cancelBooking(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelBookingDto,
  ) {
    const actorRole = (
      CUSTOMER_CAPABLE_ROLES as readonly string[]
    ).includes(user.role)
      ? 'CUSTOMER'
      : (user.role as 'ADMIN' | 'SYSTEM');

    return this.bookingsService.cancelBooking({
      bookingId,
      actorUser: { id: user.id, role: actorRole },
      dto: dto ?? {},
    });
  }
}
