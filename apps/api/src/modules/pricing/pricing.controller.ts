import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PricingRuleType, UserRole } from '@prisma/client';
import { PricingService } from './pricing.service';

type JwtUser = { id: string; email: string; role: string };

@Controller('vendor/properties/:propertyId/pricing-rules')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  list(@Param('propertyId', new ParseUUIDPipe()) propertyId: string) {
    return this.pricing.listRules(propertyId);
  }

  @Post()
  create(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Body()
    dto: {
      type: PricingRuleType;
      name?: string;
      startDate: string;
      endDate: string;
      priceMultiplier?: number;
      fixedPrice?: number;
      priority?: number;
    },
  ) {
    return this.pricing.createRule(req.user.id, propertyId, dto);
  }

  @Patch(':ruleId')
  update(
    @Req() req: { user: JwtUser },
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body()
    dto: {
      name?: string;
      startDate?: string;
      endDate?: string;
      priceMultiplier?: number;
      fixedPrice?: number | null;
      priority?: number;
      isActive?: boolean;
    },
  ) {
    return this.pricing.updateRule(req.user.id, ruleId, dto);
  }

  @Delete(':ruleId')
  remove(
    @Req() req: { user: JwtUser },
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ) {
    return this.pricing.deleteRule(req.user.id, ruleId);
  }
}
