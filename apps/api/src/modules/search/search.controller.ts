import { Controller, Get, Header, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { SearchPropertiesQuery } from './dto/search-properties.query';
import { SearchMapQuery } from './dto/search-map.query';
import { SearchMapViewportQuery } from './dto/search-map-viewport.query';
import type { AppRequest } from '../../common/i18n/app-request';

@Controller('search')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /**
   * Portal-driven: returns exactly what Search Results UI cards need.
   * - Filters/sort/pagination
   * - If checkIn/checkOut provided: filters to only date-available properties (best policy)
   */
  @Get('properties')
  @Header(
    'Cache-Control',
    'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
  )
  searchProperties(@Query() q: SearchPropertiesQuery, @Req() req: AppRequest) {
    return this.search.searchProperties(q, {
      locale: req.locale,
      displayCurrency: req.displayCurrency,
    });
  }

  /**
   * Portal-driven: returns exactly what the Map UI needs.
   * - Points: (propertyId, lat, lng, priceFrom, currency)
   * - Same filters as search
   * - If dates provided: map shows only available properties
   *
   * NOTE: This is the "general map query" (radius, optional bounds, etc).
   * For real Google Maps pan/zoom, prefer /search/map-viewport.
   */
  @Get('map')
  searchMap(@Query() q: SearchMapQuery, @Req() req: AppRequest) {
    return this.search.searchMap(q, {
      locale: req.locale,
      displayCurrency: req.displayCurrency,
    });
  }

  /**
   * ✅ Portal-driven Google Maps viewport API (required for pan/zoom UX)
   * Frontend sends bounds (north/south/east/west) and we return only markers inside.
   */
  @Get('map-viewport')
  searchMapViewport(
    @Query() q: SearchMapViewportQuery,
    @Req() req: AppRequest,
  ) {
    return this.search.searchMapViewport(q, {
      locale: req.locale,
      displayCurrency: req.displayCurrency,
    });
  }
}
