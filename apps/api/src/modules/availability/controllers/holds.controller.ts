import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';
import { CreateHoldDto, UpdateHoldDto } from '../dto/holds.dto';

import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@Controller('properties/:propertyId/availability/holds')
@UseGuards(JwtAccessGuard)
export class HoldsController {
  constructor(private readonly availability: AvailabilityService) {}

  @Post()
  async createHold(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateHoldDto,
  ) {
    return this.availability.createHold(userId, propertyId, dto);
  }

  @Patch(':holdId')
  async replaceHold(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
    @Param('holdId') holdId: string,
    @Body() dto: UpdateHoldDto,
  ) {
    return this.availability.replaceHold(userId, propertyId, holdId, dto);
  }
}
