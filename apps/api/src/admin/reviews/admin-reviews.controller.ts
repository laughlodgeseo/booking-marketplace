import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuestReviewStatus, UserRole } from '@prisma/client';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminReviewsService } from './admin-reviews.service';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@Controller('admin/reviews')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviews: AdminReviewsService) {}

  private assertAdmin(user: JwtUser) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this resource.');
    }
  }

  @Get()
  async list(
    @Req() req: { user: JwtUser },
    @Query()
    query: { status?: GuestReviewStatus; page?: string; pageSize?: string },
  ) {
    this.assertAdmin(req.user);

    return this.reviews.list({
      status: query.status,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }

  @Post(':reviewId/approve')
  async approve(
    @Req() req: { user: JwtUser },
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() dto: { notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.reviews.moderate({
      reviewId,
      adminId: req.user.id,
      approve: true,
      notes: dto.notes,
    });
  }

  @Post(':reviewId/reject')
  async reject(
    @Req() req: { user: JwtUser },
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() dto: { notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.reviews.moderate({
      reviewId,
      adminId: req.user.id,
      approve: false,
      notes: dto.notes,
    });
  }

  @Delete(':reviewId')
  async remove(
    @Req() req: { user: JwtUser },
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
  ) {
    this.assertAdmin(req.user);
    return this.reviews.deleteReview(reviewId);
  }
}
