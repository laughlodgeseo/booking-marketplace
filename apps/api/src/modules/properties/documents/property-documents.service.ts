import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import { createReadStream, type ReadStream } from 'fs';
import * as path from 'path';
import {
  API_ROOT_DIR,
  PRIVATE_UPLOADS_DIR,
  PROPERTY_DOCUMENTS_DIR,
  PROPERTY_DOCUMENTS_LEGACY_DIR,
  PUBLIC_UPLOADS_DIR,
} from '../../../common/upload/storage-paths';

type DocumentRecord = {
  id: string;
  propertyId: string;
  originalName: string | null;
  mimeType: string | null;
  url: string | null;
  storageKey: string | null;
};

type DocumentActorRole = UserRole | 'SUPER_ADMIN';

function sanitizeFilename(input: string) {
  const cleaned = input.replace(/[^\w.\- ()[\]]+/g, '_').trim();
  return cleaned.length > 0 ? cleaned : 'document';
}

@Injectable()
export class PropertyDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdminRole(role: DocumentActorRole): boolean {
    return role === UserRole.ADMIN || role === 'SUPER_ADMIN';
  }

  /**
   * We store private docs either as:
   * - storageKey (preferred)
   * - or url (legacy)
   */
  private getStoredPointer(doc: DocumentRecord): string {
    const pointer = doc.storageKey ?? doc.url;
    if (!pointer) {
      throw new InternalServerErrorException(
        'Document storage pointer missing on record.',
      );
    }
    return pointer;
  }

  private toAbsoluteLocalPath(pointer: string): string {
    const normalized = pointer.replace(/\\/g, '/').replace(/^\/+/, '');
    const candidates: string[] = [];

    const pushIfUnderRoot = (candidate: string, root: string) => {
      const rel = path.relative(root, candidate);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new ForbiddenException('Invalid document path.');
      }
      candidates.push(candidate);
    };

    if (normalized.startsWith('private_uploads/')) {
      pushIfUnderRoot(
        path.resolve(API_ROOT_DIR, normalized),
        PRIVATE_UPLOADS_DIR,
      );
    }

    if (normalized.startsWith('uploads/')) {
      pushIfUnderRoot(
        path.resolve(API_ROOT_DIR, normalized),
        PUBLIC_UPLOADS_DIR,
      );
    }

    const fileName = path.basename(normalized);
    pushIfUnderRoot(
      path.resolve(PROPERTY_DOCUMENTS_DIR, fileName),
      PROPERTY_DOCUMENTS_DIR,
    );
    pushIfUnderRoot(
      path.resolve(PROPERTY_DOCUMENTS_LEGACY_DIR, fileName),
      PROPERTY_DOCUMENTS_LEGACY_DIR,
    );

    return (
      candidates.find((absPath) => fs.existsSync(absPath)) ?? candidates[0]
    );
  }

  private async assertVendorOwnsProperty(
    userId: string,
    propertyId: string,
  ): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        vendorId: true,
      },
    });

    if (!property) throw new NotFoundException('Property not found.');

    if (property.vendorId !== userId) {
      throw new ForbiddenException('You do not own this property.');
    }
  }

  private async getDocumentOrThrow(
    propertyId: string,
    documentId: string,
  ): Promise<DocumentRecord> {
    const doc = await this.prisma.propertyDocument.findFirst({
      where: { id: documentId, propertyId },
      select: {
        id: true,
        propertyId: true,
        originalName: true,
        mimeType: true,
        url: true,
        storageKey: true,
      },
    });

    if (!doc) throw new NotFoundException('Document not found.');
    return doc;
  }

  private async resolveDocumentFile(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
    documentId: string;
  }): Promise<{
    doc: DocumentRecord;
    absPath: string;
    fileName: string;
    mimeType: string;
  }> {
    const { role, userId, propertyId, documentId } = params;
    const doc = await this.getDocumentOrThrow(propertyId, documentId);

    if (role === UserRole.VENDOR) {
      await this.assertVendorOwnsProperty(userId, propertyId);
    } else if (!this.isAdminRole(role)) {
      throw new ForbiddenException('Not allowed.');
    }

    const pointer = this.getStoredPointer(doc);
    const absPath = this.toAbsoluteLocalPath(pointer);

    try {
      await fs.promises.access(absPath, fs.constants.R_OK);
      const stat = await fs.promises.stat(absPath);
      if (!stat.isFile()) throw new NotFoundException('Document file missing.');
    } catch (err) {
      throw err instanceof NotFoundException
        ? err
        : new NotFoundException('Document file missing.');
    }

    const fileName = sanitizeFilename(doc.originalName ?? `document-${doc.id}`);
    const mimeType = doc.mimeType ?? 'application/octet-stream';
    return { doc, absPath, fileName, mimeType };
  }

  async openDocumentStream(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
    documentId: string;
  }): Promise<{
    stream: ReadStream;
    fileName: string;
    mimeType: string;
  }> {
    const resolved = await this.resolveDocumentFile(params);
    return {
      stream: createReadStream(resolved.absPath),
      fileName: resolved.fileName,
      mimeType: resolved.mimeType,
    };
  }

  async deleteDocument(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
    documentId: string;
  }): Promise<{ ok: true; id: string }> {
    const { role, userId, propertyId, documentId } = params;
    const doc = await this.getDocumentOrThrow(propertyId, documentId);

    if (role === UserRole.VENDOR) {
      await this.assertVendorOwnsProperty(userId, propertyId);
    } else if (!this.isAdminRole(role)) {
      throw new ForbiddenException('Not allowed.');
    }

    const pointer = this.getStoredPointer(doc);
    const absPath = this.toAbsoluteLocalPath(pointer);

    await this.prisma.propertyDocument.delete({
      where: { id: doc.id },
    });

    // Best-effort filesystem cleanup.
    try {
      await fs.promises.unlink(absPath);
    } catch {
      // ignore if already removed or inaccessible
    }

    return { ok: true, id: doc.id };
  }

  async getDocumentForAdmin(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
    documentId: string;
  }): Promise<{
    id: string;
    filename: string;
    mimeType: string;
    viewUrl: string;
    downloadUrl: string;
  }> {
    const { role, userId, propertyId, documentId } = params;

    if (role === UserRole.VENDOR) {
      await this.assertVendorOwnsProperty(userId, propertyId);
    } else if (!this.isAdminRole(role)) {
      throw new ForbiddenException('Not allowed.');
    }

    const doc = await this.getDocumentOrThrow(propertyId, documentId);
    const filename = sanitizeFilename(doc.originalName ?? `document-${doc.id}`);

    return {
      id: doc.id,
      filename,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      viewUrl: `/api/admin/properties/${propertyId}/documents/${doc.id}/view`,
      downloadUrl: `/api/admin/properties/${propertyId}/documents/${doc.id}/download`,
    };
  }
}
