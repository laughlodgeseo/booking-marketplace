import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole, type User } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { VendorPortalService } from './vendor-portal.service';
import { CreateVendorCalendarBlockDto } from './dto/create-vendor-calendar-block.dto';

@Controller('/vendor/calendar')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class VendorCalendarController {
  constructor(private readonly service: VendorPortalService) {}

  @Post('block')
  blockDates(
    @CurrentUser() user: User,
    @Body() body: CreateVendorCalendarBlockDto,
  ) {
    return this.service.createBlockRequest({
      userId: user.id,
      role: user.role,
      propertyId: body.propertyId,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
    });
  }
}
