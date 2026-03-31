import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PropertiesService } from './properties.service';
import { ListPropertiesDto } from './dto/list-properties.dto';
import { PropertyDetailParams } from './dto/property-detail.params';
import type { AppRequest } from '../../common/i18n/app-request';

@ApiTags('properties')
@Controller('properties')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  async list(@Query() query: ListPropertiesDto, @Req() req: AppRequest) {
    return this.properties.list(query, {
      locale: req.locale,
      displayCurrency: req.displayCurrency,
    });
  }

  @Get(':slug')
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
  )
  async bySlug(@Param() params: PropertyDetailParams, @Req() req: AppRequest) {
    const property = await this.properties.bySlug(params.slug, {
      locale: req.locale,
      displayCurrency: req.displayCurrency,
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  @Get(':slug/calendar')
  async calendar(
    @Param('slug') slug: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.properties.publicCalendarBySlug(slug, from, to);
    if (!result) throw new NotFoundException('Property not found');
    return result;
  }
}
