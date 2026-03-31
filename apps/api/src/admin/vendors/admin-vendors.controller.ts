import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminVendorsService } from './admin-vendors.service';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@ApiTags('admin-vendors')
@Controller('admin/vendors')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminVendorsController {
  constructor(private readonly service: AdminVendorsService) {}

  private assertAdmin(user: JwtUser) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this resource.');
    }
  }

  @Get()
  async list(@Req() req: { user: JwtUser }) {
    this.assertAdmin(req.user);
    return this.service.list();
  }
}
