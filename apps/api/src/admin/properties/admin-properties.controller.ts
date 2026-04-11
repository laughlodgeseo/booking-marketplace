import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminPropertiesService } from './admin-properties.service';
import { ApprovePropertyDto } from './dto/approve-property.dto';
import { RejectPropertyDto } from './dto/reject-property.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { AdminCreatePropertyDto } from './dto/admin-create-property.dto';
import { AdminUpdatePropertyDto } from './dto/admin-update-property.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '../../common/upload/image-file.filter';
import { imageUploadStorage } from '../../common/upload/multer.config';
import { validateCloudinaryUrl } from '../../common/upload/property-media-storage';
import {
  UpdateMediaCategoryDto,
  ReorderMediaDto,
  SetPropertyAmenitiesDto,
} from '../../vendor/vendor-properties.dto';
import {
  PropertyDeletionRequestStatus,
  PropertyUnpublishRequestStatus,
} from '@prisma/client';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@ApiTags('admin-properties')
@Controller('admin/properties')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPropertiesController {
  constructor(private readonly service: AdminPropertiesService) {}

  private assertAdmin(user: JwtUser) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this resource.');
    }
  }

  /**
   * ✅ Admin creates property (no review required)
   * - status defaults to APPROVED
   * - can optionally publishNow=true
   * - can assign vendorId or default to adminId
   */
  @Post()
  async create(
    @Req() req: { user: JwtUser },
    @Body() dto: AdminCreatePropertyDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.createByAdmin(req.user.id, dto);
  }

  @Get('amenities/catalog')
  async listAmenitiesCatalog(@Req() req: { user: JwtUser }) {
    this.assertAdmin(req.user);
    return this.service.listAmenitiesCatalog();
  }

  /**
   * ✅ Admin updates property basics (no review restrictions for admin)
   */
  @Patch(':id')
  async update(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUpdatePropertyDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.updateByAdmin(req.user.id, id, dto);
  }

  /**
   * ✅ Admin publish/unpublish without approval
   */
  @Post(':id/publish')
  async publish(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertAdmin(req.user);
    return this.service.publishByAdmin(req.user.id, id);
  }

  @Post(':id/unpublish')
  async unpublish(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertAdmin(req.user);
    return this.service.unpublishByAdmin(req.user.id, id);
  }

  /**
   * ✅ Admin media upload (same storage & validation as vendor)
   */
  @Post(':id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageUploadStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  async uploadMedia(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.assertAdmin(req.user);
    return this.service.addMediaByAdmin(req.user.id, id, file);
  }

  /**
   * Register a Cloudinary URL that the browser uploaded directly.
   * Avoids server-as-proxy timeouts for large images.
   */
  @Post(':id/media/register')
  async registerMedia(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('url') url: string,
  ) {
    this.assertAdmin(req.user);
    try {
      validateCloudinaryUrl(url);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid URL.',
      );
    }
    return this.service.addMediaByUrlAdmin(req.user.id, id, url);
  }

  @Patch(':propertyId/media/:mediaId/category')
  async updateMediaCategory(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() dto: UpdateMediaCategoryDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.updateMediaCategoryByAdmin(
      req.user.id,
      propertyId,
      mediaId,
      dto,
    );
  }

  @Post(':id/media/reorder')
  async reorderMedia(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReorderMediaDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.reorderMediaByAdmin(req.user.id, id, dto);
  }

  @Delete(':propertyId/media/:mediaId')
  async deleteMedia(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Query('overrideReadiness') overrideReadinessRaw?: string,
  ) {
    this.assertAdmin(req.user);
    const overrideReadiness =
      typeof overrideReadinessRaw === 'string' &&
      ['1', 'true', 'yes', 'on'].includes(overrideReadinessRaw.toLowerCase());

    return this.service.deleteMediaByAdmin(
      req.user.id,
      propertyId,
      mediaId,
      overrideReadiness,
    );
  }

  @Post(':id/amenities')
  async setAmenities(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetPropertyAmenitiesDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.setAmenitiesByAdmin(req.user.id, id, dto.amenityIds);
  }

  @Get('deletion-requests')
  async listDeletionRequests(
    @Req() req: { user: JwtUser },
    @Query()
    query: {
      status?: PropertyDeletionRequestStatus;
      page?: string;
      pageSize?: string;
    },
  ) {
    this.assertAdmin(req.user);
    return this.service.listDeletionRequests({
      status: query.status,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }

  @Get('unpublish-requests')
  async listUnpublishRequests(
    @Req() req: { user: JwtUser },
    @Query()
    query: {
      status?: PropertyUnpublishRequestStatus;
      page?: string;
      pageSize?: string;
    },
  ) {
    this.assertAdmin(req.user);
    return this.service.listUnpublishRequests({
      status: query.status,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }

  @Post('unpublish-requests/:requestId/approve')
  async approveUnpublishRequest(
    @Req() req: { user: JwtUser },
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: { notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.service.approveUnpublishRequest(
      req.user.id,
      requestId,
      dto?.notes,
    );
  }

  @Post('unpublish-requests/:requestId/reject')
  async rejectUnpublishRequest(
    @Req() req: { user: JwtUser },
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: { notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.service.rejectUnpublishRequest(
      req.user.id,
      requestId,
      dto?.notes,
    );
  }

  @Post('deletion-requests/:requestId/approve')
  async approveDeletionRequest(
    @Req() req: { user: JwtUser },
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: { notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.service.approveDeletionRequest(
      req.user.id,
      requestId,
      dto?.notes,
    );
  }

  @Post('deletion-requests/:requestId/reject')
  async rejectDeletionRequest(
    @Req() req: { user: JwtUser },
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: { notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.service.rejectDeletionRequest(
      req.user.id,
      requestId,
      dto?.notes,
    );
  }

  // -------------------------
  // Existing review workflow
  // -------------------------

  @Get('review-queue')
  async reviewQueue(
    @Req() req: { user: JwtUser },
    @Query()
    query?: {
      status?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    this.assertAdmin(req.user);
    return this.service.reviewQueue({
      status: query?.status,
      page: query?.page ? Number(query.page) : 1,
      pageSize: query?.pageSize ? Number(query.pageSize) : 20,
    });
  }

  @Post(':id/approve')
  async approve(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApprovePropertyDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.approve(req.user.id, id, dto);
  }

  @Post(':id/request-changes')
  async requestChanges(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RequestChangesDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.requestChanges(req.user.id, id, dto);
  }

  @Post(':id/reject')
  async reject(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectPropertyDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.reject(req.user.id, id, dto);
  }

  @Get(':id/changes')
  async getChanges(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertAdmin(req.user);
    return this.service.getChanges(id);
  }

  @Get(':id')
  async getOne(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertAdmin(req.user);
    return this.service.getOneByAdmin(id);
  }

  @Delete(':id')
  async deleteAdminOwnedNow(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertAdmin(req.user);
    return this.service.deleteAdminOwnedPropertyNow(req.user.id, id);
  }
}
