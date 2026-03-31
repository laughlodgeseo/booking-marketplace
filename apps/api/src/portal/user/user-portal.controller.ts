import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserPortalService } from './user-portal.service';

import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import {
  BookingStatus,
  BookingDocumentType,
  CustomerDocumentType,
  RefundStatus,
  UserRole,
  type User,
} from '@prisma/client';
import { parseDateRange, parsePageParams } from '../common/portal.utils';
import { FileInterceptor } from '@nestjs/platform-express';
import { documentFileFilter } from '../../common/upload/document-file.filter';
import {
  bookingDocumentUploadStorage,
  customerDocumentUploadStorage,
} from '../../common/upload/multer.config';
import { UploadBookingDocumentDto } from './dto/upload-booking-document.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { UploadCustomerDocumentDto } from './dto/upload-customer-document.dto';
import { Throttle } from '@nestjs/throttler';
import { PortalNotificationsService } from '../common/portal-notifications.service';

@Controller('/portal/user')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class UserPortalController {
  constructor(
    private readonly service: UserPortalService,
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

  @Get('refunds')
  refunds(
    @CurrentUser() user: User,
    @Query() query: { status?: RefundStatus; page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.getRefunds({
      userId: user.id,
      role: user.role,
      status: query.status,
      page,
      pageSize,
    });
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

  @Post('bookings/:bookingId/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: bookingDocumentUploadStorage,
      fileFilter: documentFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadBookingDocument(
    @CurrentUser() user: User,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: UploadBookingDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadBookingDocument({
      userId: user.id,
      bookingId,
      type: dto.type ?? BookingDocumentType.OTHER,
      notes: dto.notes,
      file,
    });
  }

  @Get('bookings/:bookingId/documents')
  async listBookingDocuments(
    @CurrentUser() user: User,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.service.listBookingDocuments({
      userId: user.id,
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
      bookingId,
      documentId,
      role: user.role,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.downloadName)}"`,
    );
    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Get('documents')
  async listCustomerDocuments(@CurrentUser() user: User) {
    return this.service.listCustomerDocuments({
      userId: user.id,
      role: user.role,
    });
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: customerDocumentUploadStorage,
      fileFilter: documentFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadCustomerDocument(
    @CurrentUser() user: User,
    @Body() dto: UploadCustomerDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadCustomerDocument({
      userId: user.id,
      role: user.role,
      type: dto.type ?? CustomerDocumentType.OTHER,
      notes: dto.notes,
      file,
    });
  }

  @Get('documents/:documentId/download')
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

  @Get('documents/:documentId/view')
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

  @Delete('documents/:documentId')
  async deleteCustomerDocument(
    @CurrentUser() user: User,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.service.deleteCustomerDocument({
      userId: user.id,
      role: user.role,
      documentId,
    });
  }

  @Post('reviews')
  async createReview(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.service.createReview({
      userId: user.id,
      role: user.role,
      bookingId: dto.bookingId,
      rating: dto.rating,
      cleanlinessRating: dto.cleanlinessRating,
      locationRating: dto.locationRating,
      communicationRating: dto.communicationRating,
      valueRating: dto.valueRating,
      title: dto.title,
      comment: dto.comment,
    });
  }

  @Get('reviews')
  async listMyReviews(
    @CurrentUser() user: User,
    @Query() query: { page?: string; pageSize?: string },
  ) {
    const { page, pageSize } = parsePageParams(query);
    return this.service.listMyReviews({
      userId: user.id,
      role: user.role,
      page,
      pageSize,
    });
  }
}
