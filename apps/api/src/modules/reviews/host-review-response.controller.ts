import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, GuestReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type JwtUser = { id: string; email: string; role: string };

@Controller('reviews')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class HostReviewResponseController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':reviewId/response')
  async respond(
    @Req() req: { user: JwtUser },
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: { responseText: string },
  ) {
    if (!body.responseText?.trim()) {
      throw new ForbiddenException('Response text is required.');
    }
    if (body.responseText.length > 2000) {
      throw new ForbiddenException('Response must be 2000 characters or less.');
    }

    const review = await this.prisma.guestReview.findUnique({
      where: { id: reviewId },
      include: {
        property: { select: { vendorId: true } },
      },
    });

    if (!review) throw new NotFoundException('Review not found.');

    // Only the property's vendor can respond
    if (review.property.vendorId !== req.user.id) {
      throw new ForbiddenException(
        'Only the property host can respond to this review.',
      );
    }

    // Only approved reviews can receive responses
    if (review.status !== GuestReviewStatus.APPROVED) {
      throw new ForbiddenException(
        'Can only respond to approved reviews.',
      );
    }

    const updated = await this.prisma.guestReview.update({
      where: { id: reviewId },
      data: {
        hostResponseText: body.responseText.trim(),
        hostResponseAt: new Date(),
      },
      select: {
        id: true,
        hostResponseText: true,
        hostResponseAt: true,
      },
    });

    return updated;
  }
}
