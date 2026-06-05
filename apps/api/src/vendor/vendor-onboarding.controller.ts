import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { VendorOnboardingService } from './vendor-onboarding.service';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

class StartOnboardingDto {
  displayName?: string;
}

@Controller('portal/onboarding')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.VENDOR)
export class VendorOnboardingController {
  constructor(private readonly service: VendorOnboardingService) {}

  @Get('state')
  async getState(@Req() req: { user: JwtUser }) {
    if (req.user.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot access onboarding.');
    }
    return this.service.getState(req.user.id, req.user.role as UserRole);
  }

  @Post('start')
  async start(
    @Req() req: { user: JwtUser },
    @Body() body: StartOnboardingDto,
  ) {
    if (req.user.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot access onboarding.');
    }
    return this.service.startOnboarding(
      req.user.id,
      req.user.role as UserRole,
      body.displayName,
    );
  }
}
