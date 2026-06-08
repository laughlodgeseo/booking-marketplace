import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { UserRole, VendorPayoutStatus, type User } from '@prisma/client';
import type { Response } from 'express';

import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { documentFileFilter } from '../../../common/upload/document-file.filter';
import { VendorPayoutLifecycleService } from '../services/vendor-payout-lifecycle.service';
import {
  AdminMarkPaidDto,
  PayoutNoteDto,
} from '../dto/vendor-payout-action.dto';

function parsePayoutStatus(value: unknown): VendorPayoutStatus | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!Object.values(VendorPayoutStatus).includes(raw as VendorPayoutStatus)) {
    throw new BadRequestException(`Invalid vendor payout status: ${raw}`);
  }
  return raw as VendorPayoutStatus;
}

@ApiTags('portal-admin-vendor-payouts')
@Controller('portal/admin/vendor-payouts')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PortalAdminVendorPayoutsController {
  constructor(private readonly payouts: VendorPayoutLifecycleService) {}

  // ── Static routes MUST come before dynamic :payoutId routes ────────────────

  @Get()
  list(@Query() query: { status?: string; vendorId?: string }) {
    return this.payouts.adminListVendorPayouts({
      status: parsePayoutStatus(query.status),
      vendorId: query.vendorId?.trim() || null,
    });
  }

  @Post('reconcile-amounts')
  reconcileAmounts() {
    return this.payouts.reconcilePayoutAmounts();
  }

  // ── Dynamic :payoutId routes ────────────────────────────────────────────────

  @Get(':payoutId')
  detail(@Param('payoutId') payoutId: string) {
    return this.payouts.adminGetVendorPayout(payoutId);
  }

  @Get(':payoutId/proof/view')
  async proofView(
    @Param('payoutId') payoutId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.payouts.adminGetPayoutProof(payoutId, 'view');
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.fileName)}"`,
    );
    return new StreamableFile(result.buffer);
  }

  @Get(':payoutId/proof/download')
  async proofDownload(
    @Param('payoutId') payoutId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.payouts.adminGetPayoutProof(payoutId, 'download');
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    return new StreamableFile(result.buffer);
  }

  @Post(':payoutId/mark-processing')
  markProcessing(
    @Param('payoutId') payoutId: string,
    @Body() dto: PayoutNoteDto,
  ) {
    return this.payouts.adminMarkProcessing(payoutId, dto.note);
  }

  @Post(':payoutId/upload-proof')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: documentFileFilter,
    }),
  )
  uploadProof(
    @CurrentUser() user: User,
    @Param('payoutId') payoutId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PayoutNoteDto,
  ) {
    return this.payouts.adminUploadProof({
      adminUserId: user.id,
      payoutId,
      file,
      note: dto.note,
    });
  }

  @Post(':payoutId/mark-paid')
  markPaid(
    @Param('payoutId') payoutId: string,
    @Body() dto: AdminMarkPaidDto,
  ) {
    return this.payouts.adminMarkPaid(payoutId, dto.note);
  }

  @Post(':payoutId/cancel')
  cancel(@Param('payoutId') payoutId: string, @Body() dto: PayoutNoteDto) {
    return this.payouts.adminCancelPayout(payoutId, dto.note);
  }
}
