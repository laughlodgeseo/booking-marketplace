import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { VendorPropertiesService } from './vendor-properties.service';
import { UserRole } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  ReorderMediaDto,
  UpdateMediaCategoryDto,
  UploadPropertyDocumentDto,
  RequestPropertyDeletionDto,
  SetPropertyAmenitiesDto,
} from './vendor-properties.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '../common/upload/image-file.filter';
import { documentFileFilter } from '../common/upload/document-file.filter';
import {
  imageUploadStorage,
  documentUploadStorage,
} from '../common/upload/multer.config';
import { validateCloudinaryUrl } from '../common/upload/property-media-storage';
import { UpdatePropertyLocationDto } from './dto/update-property-location.dto';
import { PaymentProvider } from '@prisma/client';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@Controller('vendor/properties')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorPropertiesController {
  constructor(private readonly service: VendorPropertiesService) {}

  private assertVendor(user: JwtUser) {
    if (!user || user.role !== 'VENDOR') {
      throw new ForbiddenException('Only vendors can access this resource.');
    }
  }

  @Get()
  async listMine(@Req() req: { user: JwtUser }) {
    this.assertVendor(req.user);
    return this.service.listMine(req.user.id);
  }

  /**
   * ✅ Batch V3: Amenities catalog (grouped)
   * GET /vendor/properties/amenities/catalog
   */
  @Get('amenities/catalog')
  async listAmenitiesCatalog(@Req() req: { user: JwtUser }) {
    this.assertVendor(req.user);
    return this.service.listAmenitiesCatalog();
  }

  @Post()
  async create(@Req() req: { user: JwtUser }, @Body() dto: CreatePropertyDto) {
    this.assertVendor(req.user);
    return this.service.create(req.user.id, dto);
  }

  @Get(':id')
  async getOne(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.getOne(req.user.id, id);
  }

  @Patch(':id')
  async update(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    this.assertVendor(req.user);
    return this.service.update(req.user.id, id, dto);
  }

  /**
   * ✅ Batch V3: Get selected amenities for property
   * GET /vendor/properties/:id/amenities
   */
  @Get(':id/amenities')
  async getAmenitiesForProperty(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.getAmenitiesForProperty(req.user.id, id);
  }

  /**
   * ✅ Batch V3: Set amenities (replace mapping)
   * POST /vendor/properties/:id/amenities
   */
  @Post(':id/amenities')
  async setAmenities(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetPropertyAmenitiesDto,
  ) {
    this.assertVendor(req.user);
    return this.service.setAmenities(req.user.id, id, dto.amenityIds);
  }

  /**
   * ✅ Portal-driven location endpoint (Google Maps pin → backend)
   * Vendor sets city/area/address + lat/lng from map pin (no manual coords typing).
   */
  @Patch(':id/location')
  async updateLocation(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePropertyLocationDto,
  ) {
    this.assertVendor(req.user);
    return this.service.updateLocation(req.user.id, id, dto);
  }

  @Post(':id/submit')
  async submitForReview(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.submitForReview(req.user.id, id);
  }

  @Patch(':id/submit')
  async submitForReviewPatch(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.submitForReview(req.user.id, id);
  }

  @Post(':id/resubmit')
  async resubmitForReview(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.resubmitForReview(req.user.id, id);
  }

  @Get(':id/changes')
  async getChanges(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.getChanges(req.user.id, id);
  }

  @Post(':id/publish')
  async publish(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.publish(req.user.id, id);
  }

  @Post(':id/unpublish')
  async unpublish(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RequestPropertyDeletionDto,
  ) {
    this.assertVendor(req.user);
    return this.service.requestUnpublish(req.user.id, id, dto.reason);
  }

  @Get(':id/unpublish-request')
  async getUnpublishRequest(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.getUnpublishRequest(req.user.id, id);
  }

  @Post(':id/unpublish-request')
  async requestUnpublish(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RequestPropertyDeletionDto,
  ) {
    this.assertVendor(req.user);
    return this.service.requestUnpublish(req.user.id, id, dto.reason);
  }

  @Get(':id/deletion-request')
  async getDeletionRequest(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.getDeletionRequest(req.user.id, id);
  }

  @Post(':id/deletion-request')
  async requestDeletion(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RequestPropertyDeletionDto,
  ) {
    this.assertVendor(req.user);
    return this.service.requestDeletion(req.user.id, id, dto.reason);
  }

  @Get(':id/activation')
  async activationStatus(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.assertVendor(req.user);
    return this.service.getActivationStatus(req.user.id, id);
  }

  @Post(':id/pay-activation')
  async payActivation(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    this.assertVendor(req.user);
    return this.service.payActivation(req.user.id, id, {
      idempotencyKey,
    });
  }

  @Post(':id/activation/invoice')
  async createActivationInvoice(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body?: { provider?: PaymentProvider; providerRef?: string },
  ) {
    this.assertVendor(req.user);
    return this.service.createActivationInvoice(req.user.id, id, {
      provider: body?.provider,
      providerRef: body?.providerRef,
    });
  }

  @Post(':id/activation/manual-confirm')
  async confirmActivationManual(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body?: { invoiceId?: string; providerRef?: string },
  ) {
    this.assertVendor(req.user);
    return this.service.confirmActivationManual(req.user.id, id, {
      invoiceId: body?.invoiceId,
      providerRef: body?.providerRef,
    });
  }

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
    this.assertVendor(req.user);
    if (!file) throw new ForbiddenException('File upload failed.');
    return this.service.addMedia(req.user.id, id, file);
  }

  /**
   * Register a Cloudinary URL the browser uploaded directly.
   * Avoids server-as-proxy timeouts for large images.
   */
  @Post(':id/media/register')
  async registerMedia(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('url') url: string,
  ) {
    this.assertVendor(req.user);
    try {
      validateCloudinaryUrl(url);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid URL.',
      );
    }
    return this.service.addMediaByUrl(req.user.id, id, url);
  }

  @Patch(':propertyId/media/:mediaId/category')
  async updateMediaCategory(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() dto: UpdateMediaCategoryDto,
  ) {
    this.assertVendor(req.user);
    return this.service.updateMediaCategory(
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
    this.assertVendor(req.user);
    return this.service.reorderMedia(req.user.id, id, dto);
  }

  @Delete(':propertyId/media/:mediaId')
  async deleteMedia(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    this.assertVendor(req.user);
    return this.service.deleteMedia(req.user.id, propertyId, mediaId);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: documentUploadStorage,
      fileFilter: documentFileFilter,
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  async uploadDocument(
    @Req() req: { user: JwtUser },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UploadPropertyDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.assertVendor(req.user);
    if (!file) throw new ForbiddenException('File upload failed.');
    return this.service.addDocument(req.user.id, id, dto, file);
  }
}
