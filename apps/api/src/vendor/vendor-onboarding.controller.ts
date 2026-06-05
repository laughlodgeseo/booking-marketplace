import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, type User } from '@prisma/client';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { StartVendorOnboardingDto } from './dto/vendor-onboarding.dto';
import { CUSTOMER_CAPABLE_ROLES } from '../common/rbac.constants';

@Controller('portal/onboarding')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(...CUSTOMER_CAPABLE_ROLES)
export class VendorOnboardingController {
  constructor(private readonly service: VendorOnboardingService) {}

  @Get('state')
  getState(@CurrentUser() user: User) {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot access host onboarding.');
    }
    return this.service.getState(user.id, user.role);
  }

  @Post('start')
  start(
    @CurrentUser() user: User,
    @Body() dto: StartVendorOnboardingDto,
  ) {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot access host onboarding.');
    }
    return this.service.startOnboarding(user.id, user.role, dto.displayName);
  }
}
