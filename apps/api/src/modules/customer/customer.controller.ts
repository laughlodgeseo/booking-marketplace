import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CustomerService } from './customer.service';
import { imageFileFilter } from '../../common/upload/image-file.filter';
import { avatarUploadStorage } from './customer-avatar.storage';

type JwtUser = { id: string; email: string; role: string };

@Controller('customer/profile')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get()
  getProfile(@Req() req: { user: JwtUser }) {
    return this.customer.getProfile(req.user.id);
  }

  @Patch()
  updateProfile(
    @Req() req: { user: JwtUser },
    @Body() dto: { fullName?: string; phone?: string },
  ) {
    return this.customer.updateProfile(req.user.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarUploadStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(
    @Req() req: { user: JwtUser },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.customer.updateAvatar(req.user.id, avatarUrl);
  }
}
