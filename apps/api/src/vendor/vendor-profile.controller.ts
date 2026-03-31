import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VendorProfileService } from './vendor-profile.service';
import { UserRole } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateVendorProfileDto } from './vendor-profile.dto';
import { UpdateVendorProfileDto } from './vendor-profile.dto';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@Controller('vendor/profile')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorProfileController {
  constructor(private readonly service: VendorProfileService) {}

  private assertVendor(user: JwtUser) {
    if (!user || user.role !== 'VENDOR') {
      throw new ForbiddenException('Only vendors can access this resource.');
    }
  }

  @Get()
  async getMyProfile(@Req() req: { user: JwtUser }) {
    this.assertVendor(req.user);
    return this.service.getMyProfile(req.user.id);
  }

  @Post()
  async createMyProfile(
    @Req() req: { user: JwtUser },
    @Body() dto: CreateVendorProfileDto,
  ) {
    this.assertVendor(req.user);
    return this.service.createMyProfile(req.user.id, dto);
  }

  @Patch()
  async updateMyProfile(
    @Req() req: { user: JwtUser },
    @Body() dto: UpdateVendorProfileDto,
  ) {
    this.assertVendor(req.user);
    return this.service.updateMyProfile(req.user.id, dto);
  }
}
