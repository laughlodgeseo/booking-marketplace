import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole, type User } from '@prisma/client';
import type { Response } from 'express';

import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { VendorPayoutLifecycleService } from '../services/vendor-payout-lifecycle.service';
import {
  PayoutDisputeDto,
  PayoutNoteDto,
} from '../dto/vendor-payout-action.dto';

@ApiTags('portal-vendor-payouts')
@Controller('portal/vendor/payouts')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class PortalVendorPayoutsController {
  constructor(private readonly payouts: VendorPayoutLifecycleService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.payouts.vendorListPayouts(user.id);
  }

  @Get(':payoutId')
  detail(@CurrentUser() user: User, @Param('payoutId') payoutId: string) {
    return this.payouts.vendorGetPayout(user.id, payoutId);
  }

  @Get(':payoutId/proof/view')
  async proofView(
    @CurrentUser() user: User,
    @Param('payoutId') payoutId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.payouts.vendorGetPayoutProof(
      user.id,
      payoutId,
      'view',
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.fileName)}"`,
    );
    return new StreamableFile(result.buffer);
  }

  @Get(':payoutId/proof/download')
  async proofDownload(
    @CurrentUser() user: User,
    @Param('payoutId') payoutId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.payouts.vendorGetPayoutProof(
      user.id,
      payoutId,
      'download',
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    return new StreamableFile(result.buffer);
  }

  @Post(':payoutId/confirm-received')
  confirmReceived(
    @CurrentUser() user: User,
    @Param('payoutId') payoutId: string,
    @Body() dto: PayoutNoteDto,
  ) {
    return this.payouts.vendorConfirmReceived(user.id, payoutId, dto.note);
  }

  @Post(':payoutId/dispute')
  dispute(
    @CurrentUser() user: User,
    @Param('payoutId') payoutId: string,
    @Body() dto: PayoutDisputeDto,
  ) {
    return this.payouts.vendorDispute(user.id, payoutId, dto.note);
  }

  // Alias for dispute — "report-issue" is more descriptive in the vendor UI
  @Post(':payoutId/report-issue')
  reportIssue(
    @CurrentUser() user: User,
    @Param('payoutId') payoutId: string,
    @Body() dto: PayoutDisputeDto,
  ) {
    return this.payouts.vendorDispute(user.id, payoutId, dto.note);
  }
}
