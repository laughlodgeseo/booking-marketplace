import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AdminPortalService } from './admin-portal.service';

import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import {
  BookingStatus,
  BlockRequestStatus,
  CustomerDocumentStatus,
  OpsTaskStatus,
  PaymentStatus,
  PropertyStatus,
  RefundStatus,
  UserRole,
  VendorStatus,
  type User,
} from '@prisma/client';

import {
  parseBucket,
  parseDateRange,
  parsePageParams,
} from '../common/portal.utils';
import { Throttle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { PortalNotificationsService } from '../common/portal-notifications.service';

@Controller('/portal/admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminPortalController {
  constructor(
    private readonly service: AdminPortalService,
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

  @Get('vendors')
  vendors(
    @CurrentUser() user: User,
    @Query() query: { status?: VendorStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listVendors({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('vendors/:vendorId')
  vendorDetail(
    @CurrentUser() user: User,
    @Param('vendorId', new ParseUUIDPipe()) vendorId: string,
  ) {
    return this.service.getVendorDetail({
      userId: user.id,
      role: user.role,
      vendorId,
    });
  }

  @Get('properties')
  properties(
    @CurrentUser() user: User,
    @Query()
    query: { status?: PropertyStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listProperties({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('properties/:propertyId')
  propertyDetail(
    @CurrentUser() user: User,
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
  ) {
    return this.service.getPropertyDetail({
      userId: user.id,
      role: user.role,
      propertyId,
    });
  }

  @Get('bookings')
  bookings(
    @CurrentUser() user: User,
    @Query()
    query: { status?: BookingStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listBookings({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('bookings/:bookingId')
  bookingDetail(
    @CurrentUser() user: User,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.service.getBookingDetail({
      userId: user.id,
      role: user.role,
      bookingId,
    });
  }

  @Get('bookings/:bookingId/documents')
  bookingDocuments(
    @CurrentUser() user: User,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.service.listBookingDocuments({
      userId: user.id,
      role: user.role,
      bookingId,
    });
  }

  @Get('bookings/:bookingId/documents/:documentId/download')
  async downloadBookingDocument(
    @CurrentUser() user: User,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.service.getBookingDocumentDownload({
      userId: user.id,
      role: user.role,
      bookingId,
      documentId,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.downloadName)}"`,
    );
    return new StreamableFile(createReadStream(file.absolutePath));
  }

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

  @Get('payments')
  payments(
    @CurrentUser() user: User,
    @Query()
    query: { status?: PaymentStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listPayments({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('payments/:paymentId')
  paymentDetail(
    @CurrentUser() user: User,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
  ) {
    return this.service.getPaymentDetail({
      userId: user.id,
      role: user.role,
      paymentId,
    });
  }

  @Get('refunds')
  refunds(
    @CurrentUser() user: User,
    @Query() query: { status?: RefundStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listRefunds({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }

  @Get('refunds/:refundId')
  refundDetail(
    @CurrentUser() user: User,
    @Param('refundId', new ParseUUIDPipe()) refundId: string,
  ) {
    return this.service.getRefundDetail({
      userId: user.id,
      role: user.role,
      refundId,
    });
  }

  @Get('customer-documents')
  customerDocuments(
    @CurrentUser() user: User,
    @Query()
    query: {
      status?: CustomerDocumentStatus;
      type?: string;
      userId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listCustomerDocuments({
      userId: user.id,
      role: user.role,
      status: query.status,
      type: query.type,
      customerId: query.userId,
      page,
      pageSize,
    });
  }

  @Get('customer-documents/:documentId')
  customerDocumentDetail(
    @CurrentUser() user: User,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.service.getCustomerDocumentDetail({
      userId: user.id,
      role: user.role,
      documentId,
    });
  }

  @Get('customer-documents/:documentId/download')
  async downloadCustomerDocument(
    @CurrentUser() user: User,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.service.getCustomerDocumentDownload({
      userId: user.id,
      role: user.role,
      documentId,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.downloadName)}"`,
    );
    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Get('customer-documents/:documentId/view')
  async viewCustomerDocument(
    @CurrentUser() user: User,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.service.getCustomerDocumentDownload({
      userId: user.id,
      role: user.role,
      documentId,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.downloadName)}"`,
    );
    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Post('customer-documents/:documentId/approve')
  approveCustomerDocument(
    @CurrentUser() user: User,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() body?: { notes?: string },
  ) {
    return this.service.approveCustomerDocument({
      userId: user.id,
      role: user.role,
      documentId,
      notes: body?.notes,
    });
  }

  @Post('customer-documents/:documentId/reject')
  rejectCustomerDocument(
    @CurrentUser() user: User,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() body?: { notes?: string },
  ) {
    return this.service.rejectCustomerDocument({
      userId: user.id,
      role: user.role,
      documentId,
      notes: body?.notes,
    });
  }

  @Get('block-requests')
  blockRequests(
    @CurrentUser() user: User,
    @Query()
    query: {
      status?: BlockRequestStatus;
      propertyId?: string;
      vendorId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listBlockRequests({
      userId: user.id,
      role: user.role,
      status: query.status,
      propertyId: query.propertyId,
      vendorId: query.vendorId,
      page,
      pageSize,
    });
  }

  @Post('block-requests/:blockRequestId/approve')
  approveBlockRequest(
    @CurrentUser() user: User,
    @Param('blockRequestId', new ParseUUIDPipe()) blockRequestId: string,
    @Body() body?: { notes?: string },
  ) {
    return this.service.approveBlockRequest({
      userId: user.id,
      role: user.role,
      blockRequestId,
      notes: body?.notes,
    });
  }

  @Post('block-requests/:blockRequestId/reject')
  rejectBlockRequest(
    @CurrentUser() user: User,
    @Param('blockRequestId', new ParseUUIDPipe()) blockRequestId: string,
    @Body() body?: { notes?: string },
  ) {
    return this.service.rejectBlockRequest({
      userId: user.id,
      role: user.role,
      blockRequestId,
      notes: body?.notes,
    });
  }

  @Get('ops-tasks')
  opsTasks(
    @CurrentUser() user: User,
    @Query()
    query: { status?: OpsTaskStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listOpsTasks({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
  }
}
