import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VendorPortalService } from './vendor-portal.service';

import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import {
  BlockRequestStatus,
  BookingStatus,
  UserRole,
  type User,
} from '@prisma/client';
import {
  parseBucket,
  parseDateRange,
  parsePageParams,
} from '../common/portal.utils';
import type { VendorOpsTaskQueryDto } from './dto/vendor-ops-task-query.dto';
import type { VendorPropertiesQueryDto } from './dto/vendor-properties-query.dto';
import { CreateVendorCalendarBlockDto } from './dto/create-vendor-calendar-block.dto';
import { Throttle } from '@nestjs/throttler';
import { PortalNotificationsService } from '../common/portal-notifications.service';

@Controller('/portal/vendor')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class VendorPortalController {
  constructor(
    private readonly service: VendorPortalService,
    private readonly notifications: PortalNotificationsService,
  ) {}

  private parseOptionalBoolean(value?: string): boolean | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return undefined;
  }

  @Get('overview')
  overview(@CurrentUser() user: User) {
    return this.service.getOverview({ userId: user.id, role: user.role });
  }

  @Get('notifications')
  notificationsList(
    @CurrentUser() user: User,
    @Query() query: { page?: string; pageSize?: string; unreadOnly?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.notifications.listForUser({
      userId: user.id,
      page,
      pageSize,
      unreadOnly: this.parseOptionalBoolean(query.unreadOnly),
    });
  }

  @Get('notifications/unread-count')
  notificationsUnreadCount(@CurrentUser() user: User) {
    return this.notifications.unreadCount(user.id);
  }

  @Post('notifications/:notificationId/read')
  markNotificationRead(
    @CurrentUser() user: User,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.notifications.markRead({
      userId: user.id,
      notificationId,
    });
  }

  @Post('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.id);
  }

  @Get('bookings')
  bookings(
    @CurrentUser() user: User,
    @Query()
    query: { status?: BookingStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.getBookings({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('analytics')
  analytics(
    @CurrentUser() user: User,
    @Query() query: { from?: string; to?: string; bucket?: string },
  ) {
    const { from, to } = parseDateRange(query);
    const bucket = parseBucket(query.bucket);
    return this.service.getAnalytics({
      userId: user.id,
      role: user.role,
      from,
      to,
      bucket,
    });
  }

  /**
   * Vendor Calendar (V1)
   * Returns normalized events across vendor properties:
   * - Booking (non-cancelled)
   * - Hold (ACTIVE)
   * - Blocked day (CalendarDayStatus.BLOCKED)
   */
  @Get('calendar')
  calendar(
    @CurrentUser() user: User,
    @Query() query: { from?: string; to?: string; propertyId?: string },
  ) {
    const { from, to } = parseDateRange(query);
    return this.service.getCalendar({
      userId: user.id,
      role: user.role,
      from,
      to,
      propertyId: query.propertyId,
    });
  }

  /**
   * Vendor Ops Tasks (Portal)
   */
  @Get('ops-tasks')
  opsTasks(@CurrentUser() user: User, @Query() query: VendorOpsTaskQueryDto) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.getOpsTasks({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  /**
   * Vendor Properties (Portal)
   */
  @Get('properties')
  properties(
    @CurrentUser() user: User,
    @Query() query: VendorPropertiesQueryDto,
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.getProperties({
      userId: user.id,
      role: user.role,
      page,
      pageSize,
    });
  }

  @Get('block-requests')
  listBlockRequests(
    @CurrentUser() user: User,
    @Query()
    query: {
      propertyId?: string;
      status?: BlockRequestStatus;
      page?: string;
      pageSize?: string;
    },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listBlockRequests({
      userId: user.id,
      role: user.role,
      propertyId: query.propertyId,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('reviews')
  reviews(
    @CurrentUser() user: User,
    @Query() query: { page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.getVendorReviews(user.id, page, pageSize);
  }

  @Post('block-requests')
  createBlockRequest(
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
