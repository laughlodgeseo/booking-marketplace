import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';
import { QuoteRequestDto } from '../dto/quote.dto';
import type { AppRequest } from '../../../common/i18n/app-request';

@Controller('properties/:propertyId/quote')
export class QuoteController {
  constructor(private readonly availability: AvailabilityService) {}

  @Post()
  async quote(
    @Param('propertyId') propertyId: string,
    @Body() dto: QuoteRequestDto,
    @Req() req: AppRequest,
  ) {
    return this.availability.quote(propertyId, dto, {
      displayCurrency: req.displayCurrency,
    });
  }
}
