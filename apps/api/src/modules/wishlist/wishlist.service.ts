import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, propertyId: string) {
    // Verify property exists and is published
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true },
    });
    if (!property) throw new NotFoundException('Property not found.');
    if (property.status !== 'PUBLISHED')
      throw new NotFoundException('Property not found.');

    try {
      const item = await this.prisma.wishlistItem.create({
        data: { userId, propertyId },
        select: { id: true, propertyId: true, createdAt: true },
      });
      return item;
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code: string }).code
          : null;
      if (code === 'P2002') {
        throw new ConflictException('Property already in wishlist.');
      }
      throw error;
    }
  }

  async remove(userId: string, propertyId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (!item) throw new NotFoundException('Wishlist item not found.');

    await this.prisma.wishlistItem.delete({ where: { id: item.id } });
    return { removed: true };
  }

  async list(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              city: true,
              area: true,
              basePrice: true,
              currency: true,
              media: {
                where: { category: 'COVER' },
                take: 1,
                select: { url: true, alt: true },
              },
            },
          },
        },
      }),
      this.prisma.wishlistItem.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }

  async check(userId: string, propertyId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
      select: { id: true },
    });
    return { inWishlist: !!item };
  }
}
