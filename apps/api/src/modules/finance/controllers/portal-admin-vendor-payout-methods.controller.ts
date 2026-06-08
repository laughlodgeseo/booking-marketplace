import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PayoutMethodStatus, UserRole } from '@prisma/client';

import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { VendorPayoutLifecycleService } from '../services/vendor-payout-lifecycle.service';
import { RejectPayoutMethodDto } from '../dto/vendor-payout-method.dto';

function parseMethodStatus(value: unknown): PayoutMethodStatus | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!Object.values(PayoutMethodStatus).includes(raw as PayoutMethodStatus)) {
    throw new BadRequestException(`Invalid payout method status: ${raw}`);
  }
  return raw as PayoutMethodStatus;
}

@ApiTags('portal-admin-vendor-payout-methods')
@Controller('portal/admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PortalAdminVendorPayoutMethodsController {
  constructor(private readonly payouts: VendorPayoutLifecycleService) {}

  @Get('vendor-payout-methods')
  list(@Query() query: { status?: string; vendorId?: string }) {
    return this.payouts.adminListMethods({
      status: parseMethodStatus(query.status),
      vendorId: query.vendorId?.trim() || null,
    });
  }

  @Get('vendor-payout-methods/:methodId')
  detail(@Param('methodId') methodId: string) {
    return this.payouts.adminGetMethod(methodId);
  }

  @Get('vendors/:vendorId/payout-methods')
  listForVendor(@Param('vendorId') vendorId: string) {
    return this.payouts.adminListMethods({ vendorId, status: null });
  }

  @Post('vendor-payout-methods/:methodId/verify')
  verify(@Param('methodId') methodId: string) {
    return this.payouts.adminVerifyMethod(methodId);
  }

  @Post('vendor-payout-methods/:methodId/reject')
  reject(
    @Param('methodId') methodId: string,
    @Body() dto: RejectPayoutMethodDto,
  ) {
    return this.payouts.adminRejectMethod(methodId, dto.reason);
  }
}
