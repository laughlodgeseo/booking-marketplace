/**
 * Unit tests — UserPortalService.deleteCustomerDocument()
 *
 * Verifies:
 * 1. Image document → storage.delete called with 'image/jpeg' (image resource type)
 * 2. PDF document   → storage.delete called with 'application/pdf' (raw resource type)
 * 3. DB row is NOT deleted when storage.delete throws (Cloudinary error)
 * 4. Legacy disk-only document (no cloudinaryPublicId) skips storage.delete
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UserPortalService } from './user-portal.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUSTOMER_USER_ID = 'user_customer_1';
const DOC_ID = 'doc_1';

function makeDoc(overrides: Partial<{
  id: string;
  userId: string;
  fileKey: string | null;
  cloudinaryPublicId: string | null;
  mimeType: string | null;
}> = {}) {
  return {
    id: DOC_ID,
    userId: CUSTOMER_USER_ID,
    fileKey: null,
    cloudinaryPublicId: 'laugh-lodge/customer-documents/user_1/abc',
    mimeType: 'image/jpeg',
    ...overrides,
  };
}

function buildService(docOverrides?: Parameters<typeof makeDoc>[0]) {
  const doc = makeDoc(docOverrides);

  const prisma = {
    customerDocument: {
      findUnique: jest.fn().mockResolvedValue(doc),
      delete: jest.fn().mockResolvedValue({ id: doc.id }),
    },
  } as unknown as PrismaService;

  const storageMock = {
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;

  const service = new UserPortalService(prisma, storageMock);

  return { service, prisma, storage: storageMock, doc };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('UserPortalService.deleteCustomerDocument()', () => {
  const params = {
    userId: CUSTOMER_USER_ID,
    role: UserRole.CUSTOMER,
    documentId: DOC_ID,
  };

  describe('Cloudinary deletion routing', () => {
    it('passes image/jpeg mimeType to storage.delete for image documents', async () => {
      const { service, storage } = buildService({ mimeType: 'image/jpeg' });

      await service.deleteCustomerDocument(params);

      expect((storage.delete as jest.Mock)).toHaveBeenCalledWith(
        expect.any(String),
        'image/jpeg',
      );
    });

    it('passes application/pdf mimeType to storage.delete for PDF documents', async () => {
      const { service, storage } = buildService({ mimeType: 'application/pdf' });

      await service.deleteCustomerDocument(params);

      expect((storage.delete as jest.Mock)).toHaveBeenCalledWith(
        expect.any(String),
        'application/pdf',
      );
    });

    it('passes the correct cloudinaryPublicId to storage.delete', async () => {
      const publicId = 'laugh-lodge/customer-documents/user_1/specific-key';
      const { service, storage } = buildService({ cloudinaryPublicId: publicId });

      await service.deleteCustomerDocument(params);

      expect((storage.delete as jest.Mock)).toHaveBeenCalledWith(
        publicId,
        expect.any(String),
      );
    });
  });

  describe('Cloudinary-first ordering — DB integrity', () => {
    it('does NOT delete DB row when storage.delete throws', async () => {
      const { service, prisma, storage } = buildService({ mimeType: 'image/jpeg' });
      (storage.delete as jest.Mock).mockRejectedValue(
        new Error('Cloudinary delete failed: 401 Unauthorized'),
      );

      await expect(service.deleteCustomerDocument(params)).rejects.toThrow(
        'Cloudinary delete failed: 401 Unauthorized',
      );

      expect(
        (prisma.customerDocument as unknown as { delete: jest.Mock }).delete,
      ).not.toHaveBeenCalled();
    });

    it('deletes DB row after successful storage.delete', async () => {
      const { service, prisma } = buildService({ mimeType: 'image/jpeg' });

      await service.deleteCustomerDocument(params);

      expect(
        (prisma.customerDocument as unknown as { delete: jest.Mock }).delete,
      ).toHaveBeenCalledWith({ where: { id: DOC_ID } });
    });
  });

  describe('Legacy disk-only documents', () => {
    it('skips storage.delete when cloudinaryPublicId is null', async () => {
      const { service, storage } = buildService({
        cloudinaryPublicId: null,
        fileKey: 'legacy-uuid.pdf',
        mimeType: 'application/pdf',
      });

      await service.deleteCustomerDocument(params);

      expect((storage.delete as jest.Mock)).not.toHaveBeenCalled();
    });
  });

  describe('Access control', () => {
    it('throws NotFoundException when document does not exist', async () => {
      const { service, prisma } = buildService();
      (
        prisma.customerDocument as unknown as { findUnique: jest.Mock }
      ).findUnique.mockResolvedValue(null);

      await expect(service.deleteCustomerDocument(params)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when document belongs to a different user', async () => {
      const { service } = buildService({ userId: 'other_user' });

      await expect(service.deleteCustomerDocument(params)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
