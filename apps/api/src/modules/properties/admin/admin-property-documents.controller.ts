import { Controller, Delete, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { JwtAccessGuard } from '../../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { UserRole, type User } from '@prisma/client';
import { PropertyDocumentsService } from '../documents/property-documents.service';

@Controller('admin/properties/:propertyId/documents')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN, 'SUPER_ADMIN' as UserRole)
export class AdminPropertyDocumentsController {
  constructor(private readonly docs: PropertyDocumentsService) {}

  @Get(':documentId/access')
  async access(
    @Param('propertyId') propertyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.docs.getDocumentForAdmin({
      role: user.role,
      userId: user.id,
      propertyId,
      documentId,
    });
  }

  @Get(':documentId/download')
  async download(
    @Param('propertyId') propertyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const file = await this.docs.openDocumentStream({
      role: user.role,
      userId: user.id,
      propertyId,
      documentId,
      mode: 'download',
    });
    if (!file) {
      res.status(204).end();
      return;
    }

    if (file.type === 'external') {
      res.redirect(file.url);
      return;
    }

    const { stream, fileName, mimeType } = file;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });

    stream.pipe(res);
  }

  @Get(':documentId/view')
  async view(
    @Param('propertyId') propertyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const file = await this.docs.openDocumentStream({
      role: user.role,
      userId: user.id,
      propertyId,
      documentId,
      mode: 'view',
    });
    if (!file) {
      res.status(204).end();
      return;
    }

    if (file.type === 'external') {
      res.redirect(file.url);
      return;
    }

    const { stream, fileName, mimeType } = file;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });

    stream.pipe(res);
  }

  @Delete(':documentId')
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.docs.deleteDocument({
      role: user.role,
      userId: user.id,
      propertyId,
      documentId,
    });
  }
}
