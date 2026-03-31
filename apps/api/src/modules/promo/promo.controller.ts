import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PromoService } from './promo.service';

@Controller('admin/promo-codes')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PromoAdminController {
  constructor(private readonly promo: PromoService) {}

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.promo.list({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Post()
  create(
    @Body()
    dto: {
      code: string;
      discountPercent?: number;
      discountAmount?: number;
      validFrom: string;
      validTo: string;
      usageLimit?: number;
      minBookingAmount?: number;
      maxDiscount?: number;
      propertyId?: string;
    },
  ) {
    return this.promo.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.promo.update(id, dto as any);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promo.delete(id);
  }
}

/**
 * Public promo validation endpoint (customer-facing).
 */
@Controller('bookings/promo')
@UseGuards(JwtAccessGuard)
export class PromoValidateController {
  constructor(private readonly promo: PromoService) {}

  @Post('validate')
  validate(
    @Body()
    body: {
      code: string;
      bookingAmount: number;
      propertyId?: string;
    },
  ) {
    return this.promo.applyPromo(body);
  }
}
