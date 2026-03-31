import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuestReviewStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';

type GuestReviewWithRelations = Prisma.GuestReviewGetPayload<{
  include: {
    property: {
      select: { id: true; title: true; slug: true };
    };
    booking: {
      select: { id: true; checkIn: true; checkOut: true };
    };
    customer: {
      select: { id: true; email: true; fullName: true };
    };
    moderatedByAdmin: {
      select: { id: true; email: true; fullName: true };
    };
  };
}>;

@Injectable()
export class AdminReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeReview(review: GuestReviewWithRelations) {
    return {
      id: review.id,
      rating: review.rating,
      cleanlinessRating: review.cleanlinessRating,
      locationRating: review.locationRating,
      communicationRating: review.communicationRating,
      valueRating: review.valueRating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      adminNotes: review.moderationNotes,
      moderationNotes: review.moderationNotes,
      createdAt: review.createdAt.toISOString(),
      reviewedAt: review.moderatedAt?.toISOString() ?? null,
      property: review.property,
      booking: {
        ...review.booking,
        checkIn: review.booking.checkIn.toISOString(),
        checkOut: review.booking.checkOut.toISOString(),
      },
      customer: review.customer,
      moderatedByAdmin: review.moderatedByAdmin,
    };
  }

  async list(params: {
    status?: GuestReviewStatus;
    page: number;
    pageSize: number;
  }) {
    const page = params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize > 0 ? params.pageSize : 20;

    const where = params.status ? { status: params.status } : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.guestReview.count({ where }),
      this.prisma.guestReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          property: {
            select: { id: true, title: true, slug: true },
          },
          booking: {
            select: { id: true, checkIn: true, checkOut: true },
          },
          customer: {
            select: { id: true, email: true, fullName: true },
          },
          moderatedByAdmin: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.serializeReview(item)),
    };
  }

  async deleteReview(reviewId: string) {
    const review = await this.prisma.guestReview.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('Review not found.');

    await this.prisma.guestReview.delete({ where: { id: reviewId } });
    return { deleted: true, reviewId };
  }

  async moderate(params: {
    reviewId: string;
    adminId: string;
    approve: boolean;
    notes?: string;
  }) {
    const review = await this.prisma.guestReview.findUnique({
      where: { id: params.reviewId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!review) throw new NotFoundException('Review not found.');

    if (
      review.status !== GuestReviewStatus.PENDING &&
      review.status !== GuestReviewStatus.REJECTED
    ) {
      throw new BadRequestException('Review is already approved.');
    }

    const nextStatus = params.approve
      ? GuestReviewStatus.APPROVED
      : GuestReviewStatus.REJECTED;

    const updated = await this.prisma.guestReview.update({
      where: { id: params.reviewId },
      data: {
        status: nextStatus,
        moderatedByAdminId: params.adminId,
        moderatedAt: new Date(),
        moderationNotes: params.notes?.trim() || null,
      },
      include: {
        property: {
          select: { id: true, title: true, slug: true },
        },
        booking: {
          select: { id: true, checkIn: true, checkOut: true },
        },
        customer: {
          select: { id: true, email: true, fullName: true },
        },
        moderatedByAdmin: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    return this.serializeReview(updated);
  }
}
