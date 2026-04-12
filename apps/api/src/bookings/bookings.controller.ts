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
import { UserRole } from '@prisma/client';

import { CreateBookingDto } from './booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingsService } from './bookings.service';

import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('bookings')
@UseGuards(JwtAccessGuard, RolesGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
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

  // ✅ Cancellation (policy-based). Roles enforced inside service:
  // - CUSTOMER can cancel own booking
  // - VENDOR can cancel bookings for own property (strict reasons only)
  // - ADMIN can cancel any booking
  @Post(':id/cancel')
  async cancelBooking(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking({
      bookingId,
      actorUser: { id: user.id, role: user.role },
      dto: dto ?? {},
    });
  }
}
