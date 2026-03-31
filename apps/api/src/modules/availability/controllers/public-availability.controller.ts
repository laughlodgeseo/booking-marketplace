import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AvailabilityService } from '../availability.service';

@Controller('properties/:propertyId/availability')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class PublicAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  async getRange(
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.availability.getAvailabilityRange(propertyId, from, to);
  }
}
