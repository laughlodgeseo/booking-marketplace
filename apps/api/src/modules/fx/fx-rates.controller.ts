import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UpsertFxRatesDto } from './dto/upsert-fx-rates.dto';
import { UserRole } from '@prisma/client';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FxRatesService } from './fx-rates.service';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@Controller('public/fx-rates')
export class FxRatesPublicController {
  constructor(private readonly service: FxRatesService) {}

  @Get()
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
  )
  async latest() {
    return this.service.getLatestRates();
  }
}

@Controller('admin/fx-rates')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FxRatesAdminController {
  constructor(private readonly service: FxRatesService) {}

  private assertAdmin(user: JwtUser) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this resource.');
    }
  }

  @Post()
  async upsert(@Req() req: { user: JwtUser }, @Body() dto: UpsertFxRatesDto) {
    this.assertAdmin(req.user);
    return this.service.adminUpsertManual(dto);
  }
}
