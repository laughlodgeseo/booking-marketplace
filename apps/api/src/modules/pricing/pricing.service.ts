import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingRuleType } from '@prisma/client';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate the nightly price for a given date, applying the highest-priority
   * active pricing rule that covers that date.
   */
  async getNightlyPrice(
    propertyId: string,
    date: Date,
  ): Promise<{ price: number; ruleApplied: string | null }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { basePrice: true },
    });
    if (!property) throw new NotFoundException('Property not found.');

    const rule = await this.prisma.pricingRule.findFirst({
      where: {
        propertyId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { priority: 'desc' },
    });

    if (!rule) {
      return { price: property.basePrice, ruleApplied: null };
    }

    const price = rule.fixedPrice ?? Math.round(property.basePrice * rule.priceMultiplier);
    return { price, ruleApplied: rule.id };
  }

  /**
   * Calculate total price for a date range, applying rules per night.
   */
  async calculateTotal(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<{
    nightlyBreakdown: Array<{ date: string; price: number; ruleId: string | null }>;
    subtotal: number;
  }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { basePrice: true },
    });
    if (!property) throw new NotFoundException('Property not found.');

    const rules = await this.prisma.pricingRule.findMany({
      where: {
        propertyId,
        isActive: true,
        startDate: { lte: checkOut },
        endDate: { gte: checkIn },
      },
      orderBy: { priority: 'desc' },
    });

    const breakdown: Array<{ date: string; price: number; ruleId: string | null }> = [];
    const current = new Date(checkIn);
    while (current < checkOut) {
      const matchingRule = rules.find(
        (r) => current >= r.startDate && current <= r.endDate,
      );

      const price = matchingRule
        ? (matchingRule.fixedPrice ?? Math.round(property.basePrice * matchingRule.priceMultiplier))
        : property.basePrice;

      breakdown.push({
        date: current.toISOString().split('T')[0],
        price,
        ruleId: matchingRule?.id ?? null,
      });

      current.setDate(current.getDate() + 1);
    }

    const subtotal = breakdown.reduce((sum, n) => sum + n.price, 0);
    return { nightlyBreakdown: breakdown, subtotal };
  }

  // ─── CRUD for vendors/admins ───────────────────────────────────────

  async createRule(
    userId: string,
    propertyId: string,
    dto: {
      type: PricingRuleType;
      name?: string;
      startDate: string;
      endDate: string;
      priceMultiplier?: number;
      fixedPrice?: number;
      priority?: number;
    },
    options?: { skipOwnershipCheck?: boolean },
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { vendorId: true },
    });
    if (!property) throw new NotFoundException('Property not found.');
    if (!options?.skipOwnershipCheck && property.vendorId !== userId) {
      throw new BadRequestException('Not your property.');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('endDate must be after startDate.');

    return this.prisma.pricingRule.create({
      data: {
        propertyId,
        type: dto.type,
        name: dto.name,
        startDate: start,
        endDate: end,
        priceMultiplier: dto.priceMultiplier ?? 1.0,
        fixedPrice: dto.fixedPrice,
        priority: dto.priority ?? 0,
      },
    });
  }

  async listRules(propertyId: string) {
    return this.prisma.pricingRule.findMany({
      where: { propertyId },
      orderBy: [{ startDate: 'asc' }, { priority: 'desc' }],
    });
  }

  async updateRule(
    userId: string,
    ruleId: string,
    dto: {
      name?: string;
      startDate?: string;
      endDate?: string;
      priceMultiplier?: number;
      fixedPrice?: number | null;
      priority?: number;
      isActive?: boolean;
    },
    options?: { skipOwnershipCheck?: boolean },
  ) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id: ruleId },
      include: { property: { select: { vendorId: true } } },
    });
    if (!rule) throw new NotFoundException('Pricing rule not found.');
    if (!options?.skipOwnershipCheck && rule.property.vendorId !== userId) {
      throw new BadRequestException('Not your property.');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.priceMultiplier !== undefined) data.priceMultiplier = dto.priceMultiplier;
    if (dto.fixedPrice !== undefined) data.fixedPrice = dto.fixedPrice;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.pricingRule.update({ where: { id: ruleId }, data });
  }

  async deleteRule(
    userId: string,
    ruleId: string,
    options?: { skipOwnershipCheck?: boolean },
  ) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id: ruleId },
      include: { property: { select: { vendorId: true } } },
    });
    if (!rule) throw new NotFoundException('Pricing rule not found.');
    if (!options?.skipOwnershipCheck && rule.property.vendorId !== userId) {
      throw new BadRequestException('Not your property.');
    }

    await this.prisma.pricingRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  }
}
