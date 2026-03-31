import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { getCloudinaryUploadParams } from '../../common/upload/property-media-storage';

type JwtUser = { id: string; role: string };

@Controller('media')
@UseGuards(JwtAccessGuard)
export class MediaController {
  /**
   * GET /media/upload-signature?propertyId=<uuid>&scope=admin|vendor
   *
   * Returns the parameters the browser needs to upload an image directly to
   * Cloudinary, eliminating the server-as-proxy timeout.
   *
   * If Cloudinary is not configured, returns `{ mode: 'server' }` so the
   * caller can fall back to the existing multipart-upload endpoint.
   */
  @Get('upload-signature')
  getUploadSignature(
    @Req() req: { user: JwtUser },
    @Query('propertyId') propertyId: string,
    @Query('scope') scope: string,
  ) {
    if (scope !== 'admin' && scope !== 'vendor') {
      throw new BadRequestException("scope must be 'admin' or 'vendor'.");
    }

    // Vendors may only request vendor-scoped signatures.
    if (scope === 'admin' && req.user.role !== 'ADMIN') {
      throw new BadRequestException(
        'Only admins can request admin-scoped signatures.',
      );
    }

    const pid = (propertyId ?? '').trim();
    if (!pid) {
      throw new BadRequestException('propertyId is required.');
    }

    return getCloudinaryUploadParams(pid, scope);
  }
}
