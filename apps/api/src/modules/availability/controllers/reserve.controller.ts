import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';
import { ReserveRequestDto } from '../dto/reserve.dto';
import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../../auth/types/auth-user.type';
import type { AppRequest } from '../../../common/i18n/app-request';

@Controller('properties/:propertyId/reserve')
@UseGuards(JwtAccessGuard)
export class ReserveController {
  constructor(private readonly availability: AvailabilityService) {}

  @Post()
  async reserve(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: ReserveRequestDto,
    @Req() req: AppRequest,
  ) {
    return this.availability.reserve(user, propertyId, dto, {
      displayCurrency: req.displayCurrency,
    });
  }
}
