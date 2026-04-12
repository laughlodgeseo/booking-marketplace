import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyDocumentType, UserRole } from '@prisma/client';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import {
  API_ROOT_DIR,
  PRIVATE_UPLOADS_DIR,
  PROPERTY_DOCUMENTS_DIR,
  PROPERTY_DOCUMENTS_LEGACY_DIR,
  PUBLIC_UPLOADS_DIR,
} from '../../../common/upload/storage-paths';
import cloudinary from '../../../infra/cloudinary/cloudinary.service';

type DocumentRecord = {
  id: string;
  propertyId: string;
  type: PropertyDocumentType;
  originalName: string | null;
  mimeType: string | null;
  url: string | null;
  storageKey: string | null;
};

type DocumentActorRole = UserRole | 'SUPER_ADMIN';
type DocumentOpenMode = 'view' | 'download';

type DocumentStreamResult = {
  type: 'stream';
  stream: Readable;
  fileName: string;
  mimeType: string;
};

type ExternalDocumentResult = {
  type: 'external';
  url: string;
};

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

  private isCloudinaryUrl(pointer: string): boolean {
    return pointer.includes('res.cloudinary.com');
  }

  private isHttpPointer(pointer: string): boolean {
    return /^https?:\/\//i.test(pointer);
  }

  private normalizeCloudinaryUrl(url: string): string {
    if (!url) return url;

    // Keep stored Cloudinary URL as-is (legacy data may be mixed).
    return url;
  }

  private generateDownloadUrl(url: string): string | null {
    if (!url) return null;
    return url.replace('/upload/', '/upload/fl_attachment/');
  }

  private assertAllowedCloudinaryUrl(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ForbiddenException('Invalid remote document URL.');
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host !== 'res.cloudinary.com' &&
      !host.endsWith('.res.cloudinary.com')
    ) {
      throw new ForbiddenException('Remote document URL host is not allowed.');
    }

    return parsed.toString();
  }

  /**
   * We store private docs either as:
   * - storageKey (preferred)
   * - or url (legacy)
   */
  private getStoredPointer(doc: DocumentRecord): string {
    const remoteUrl = doc.url?.trim();
    if (remoteUrl && this.isCloudinaryUrl(remoteUrl)) {
      return this.assertAllowedCloudinaryUrl(remoteUrl);
    }

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
        type: true,
        originalName: true,
        mimeType: true,
        url: true,
        storageKey: true,
      },
    });

    if (!doc) throw new NotFoundException('Document not found.');
    return doc;
  }

  private async assertActorAccess(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
  }): Promise<void> {
    const { role, userId, propertyId } = params;
    if (role === UserRole.VENDOR) {
      await this.assertVendorOwnsProperty(userId, propertyId);
      return;
    }
    if (!this.isAdminRole(role)) {
      throw new ForbiddenException('Not allowed.');
    }
  }

  private async resolveLocalDocumentFile(params: {
    doc: DocumentRecord;
    pointer: string;
  }): Promise<{
    absPath: string;
    fileName: string;
    mimeType: string;
  } | null> {
    const { doc, pointer } = params;
    let absPath: string;
    try {
      absPath = this.toAbsoluteLocalPath(pointer);
    } catch {
      return null;
    }

    try {
      await fs.promises.access(absPath, fs.constants.R_OK);
      const stat = await fs.promises.stat(absPath);
      if (!stat.isFile()) return null;
    } catch {
      return null;
    }

    return {
      absPath,
      fileName: sanitizeFilename(doc.originalName ?? `document-${doc.id}`),
      mimeType: doc.mimeType ?? 'application/octet-stream',
    };
  }

  private async deleteCloudinaryAsset(publicId: string): Promise<void> {
    type CloudinaryDestroyResult = { result?: string };

    const id = publicId.trim();
    if (!id) return;

    const resourceTypes: Array<'image' | 'raw' | 'video'> = [
      'raw',
      'image',
      'video',
    ];

    for (const resourceType of resourceTypes) {
      try {
        const destroyResult = (await cloudinary.uploader.destroy(id, {
          resource_type: resourceType,
          invalidate: true,
        })) as CloudinaryDestroyResult;
        if (
          destroyResult.result === 'ok' ||
          destroyResult.result === 'not found'
        ) {
          return;
        }
      } catch {
        // continue and try other resource types
      }
    }
  }

  async openDocumentStream(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
    documentId: string;
    mode?: DocumentOpenMode;
  }): Promise<DocumentStreamResult | ExternalDocumentResult | null> {
    const { role, userId, propertyId, documentId, mode = 'view' } = params;
    await this.assertActorAccess({ role, userId, propertyId });

    const doc = await this.getDocumentOrThrow(propertyId, documentId);
    const pointer = this.getStoredPointer(doc);

    if (this.isCloudinaryUrl(pointer)) {
      const documentUrl = this.normalizeCloudinaryUrl(
        this.assertAllowedCloudinaryUrl(pointer),
      );
      if (!documentUrl) return null;

      return {
        type: 'external',
        url:
          mode === 'download'
            ? (this.generateDownloadUrl(documentUrl) ?? documentUrl)
            : documentUrl,
      };
    }

    const local = await this.resolveLocalDocumentFile({ doc, pointer });
    if (!local) return null;

    return {
      type: 'stream',
      stream: createReadStream(local.absPath),
      fileName: local.fileName,
      mimeType: local.mimeType,
    };
  }

  async deleteDocument(params: {
    role: DocumentActorRole;
    userId: string;
    propertyId: string;
    documentId: string;
  }): Promise<{ ok: true; id: string }> {
    const { role, userId, propertyId, documentId } = params;
    await this.assertActorAccess({ role, userId, propertyId });

    const doc = await this.getDocumentOrThrow(propertyId, documentId);

    const pointer = this.getStoredPointer(doc);
    const isRemote = this.isHttpPointer(pointer);
    const absPath = isRemote ? null : this.toAbsoluteLocalPath(pointer);

    await this.prisma.propertyDocument.delete({
      where: { id: doc.id },
    });

    if (isRemote) {
      if (doc.storageKey) {
        await this.deleteCloudinaryAsset(doc.storageKey);
      }
    } else if (absPath) {
      // Best-effort filesystem cleanup.
      try {
        await fs.promises.unlink(absPath);
      } catch {
        // ignore if already removed or inaccessible
      }
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
    const remoteUrl = doc.url?.trim();

    if (remoteUrl && this.isCloudinaryUrl(remoteUrl)) {
      const allowedUrl = this.assertAllowedCloudinaryUrl(remoteUrl);
      const safeUrl = this.normalizeCloudinaryUrl(allowedUrl);
      return {
        id: doc.id,
        filename,
        mimeType: doc.mimeType ?? 'application/octet-stream',
        viewUrl: safeUrl,
        downloadUrl: this.generateDownloadUrl(safeUrl) ?? safeUrl,
      };
    }

    return {
      id: doc.id,
      filename,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      viewUrl: `/api/admin/properties/${propertyId}/documents/${doc.id}/view`,
      downloadUrl: `/api/admin/properties/${propertyId}/documents/${doc.id}/download`,
    };
  }
}
