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
import { PricingService } from '../../modules/pricing/pricing.service';

type JwtUser = { id: string; email: string; role: string };

/**
 * Admin pricing controller — admins can manage pricing rules on ANY property.
 * Admin pricing always takes precedence via high priority (priority: 999).
 */
@Controller('admin/properties/:propertyId/pricing-rules')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPricingController {
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
    // Admin overrides get priority 999 by default so they always win over vendor rules
    return this.pricing.createRule(
      req.user.id,
      propertyId,
      { ...dto, priority: dto.priority ?? 999 },
      { skipOwnershipCheck: true },
    );
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
    return this.pricing.updateRule(req.user.id, ruleId, dto, {
      skipOwnershipCheck: true,
    });
  }

  @Delete(':ruleId')
  remove(
    @Req() req: { user: JwtUser },
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ) {
    return this.pricing.deleteRule(req.user.id, ruleId, {
      skipOwnershipCheck: true,
    });
  }
}
