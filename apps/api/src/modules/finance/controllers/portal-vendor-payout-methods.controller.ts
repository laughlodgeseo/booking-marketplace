import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole, type User } from '@prisma/client';

import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { VendorPayoutLifecycleService } from '../services/vendor-payout-lifecycle.service';
import { UpsertVendorPayoutMethodDto } from '../dto/vendor-payout-method.dto';

@ApiTags('portal-vendor-payout-methods')
@Controller('portal/vendor/payout-methods')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class PortalVendorPayoutMethodsController {
  constructor(private readonly payouts: VendorPayoutLifecycleService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.payouts.vendorListMethods(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: UpsertVendorPayoutMethodDto) {
    return this.payouts.vendorCreateMethod(user.id, dto);
  }

  @Patch(':methodId')
  update(
    @CurrentUser() user: User,
    @Param('methodId') methodId: string,
    @Body() dto: UpsertVendorPayoutMethodDto,
  ) {
    return this.payouts.vendorUpdateMethod(user.id, methodId, dto);
  }

  @Delete(':methodId')
  disable(@CurrentUser() user: User, @Param('methodId') methodId: string) {
    return this.payouts.vendorDisableMethod(user.id, methodId);
  }

  @Post(':methodId/set-default')
  setDefault(@CurrentUser() user: User, @Param('methodId') methodId: string) {
    return this.payouts.vendorSetDefaultMethod(user.id, methodId);
  }
}
