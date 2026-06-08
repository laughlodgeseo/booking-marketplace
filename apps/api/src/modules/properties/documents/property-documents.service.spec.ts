import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PropertyDocumentType, UserRole } from '@prisma/client';
import { Readable } from 'stream';
import { PropertyDocumentsService } from './property-documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../../infra/storage/storage.service';

function makeDoc(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'doc_1',
    propertyId: 'prop_1',
    type: PropertyDocumentType.OWNERSHIP_PROOF,
    originalName: 'lease.pdf',
    mimeType: 'application/pdf',
    url: null,
    storageKey: 'laugh-lodge/property-documents/prop_1/abc',
    cloudinaryResourceType: 'raw',
    cloudinaryDeliveryType: 'authenticated',
    storageProvider: 'cloudinary',
    ...overrides,
  };
}

function buildService(doc: ReturnType<typeof makeDoc> | null) {
  const prisma = {
    property: {
      findUnique: jest.fn().mockResolvedValue({ id: 'prop_1', vendorId: 'vendor_1' }),
    },
    propertyDocument: {
      findFirst: jest.fn().mockResolvedValue(doc),
      delete: jest.fn().mockResolvedValue({ id: 'doc_1' }),
    },
  } as unknown as PrismaService;
  const storage = {
    getSignedUrl: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/raw/authenticated/s--abc--/file'),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;
  return { service: new PropertyDocumentsService(prisma, storage), prisma, storage };
}

describe('PropertyDocumentsService', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(Buffer.from('file-bytes'), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      }),
    );
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockRestore();
  });

  it('throws 403 for a customer trying to open vendor property documents', async () => {
    const { service } = buildService(makeDoc());
    await expect(
      service.openDocumentStream({
        role: UserRole.CUSTOMER,
        userId: 'customer_1',
        propertyId: 'prop_1',
        documentId: 'doc_1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws 404 when the document row is missing', async () => {
    const { service } = buildService(null);
    await expect(
      service.openDocumentStream({
        role: UserRole.ADMIN,
        userId: 'admin_1',
        propertyId: 'prop_1',
        documentId: 'missing',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns null for legacy local records whose file is missing', async () => {
    const { service } = buildService(
      makeDoc({
        storageKey: 'legacy-missing.pdf',
        cloudinaryResourceType: null,
        cloudinaryDeliveryType: null,
        storageProvider: 'local',
      }),
    );
    await expect(
      service.openDocumentStream({
        role: UserRole.ADMIN,
        userId: 'admin_1',
        propertyId: 'prop_1',
        documentId: 'doc_1',
      }),
    ).resolves.toBeNull();
  });

  it('fetches Cloudinary documents via signed raw URL and returns a stream', async () => {
    const { service, storage } = buildService(makeDoc());
    const result = await service.openDocumentStream({
      role: UserRole.ADMIN,
      userId: 'admin_1',
      propertyId: 'prop_1',
      documentId: 'doc_1',
    });

    expect(storage.getSignedUrl).toHaveBeenCalledWith(
      'laugh-lodge/property-documents/prop_1/abc',
      expect.objectContaining({ resourceType: 'raw', deliveryType: 'authenticated' }),
    );
    expect(result?.stream).toBeInstanceOf(Readable);
    expect(result?.mimeType).toBe('application/pdf');
  });

  it('deletes Cloudinary documents with the stored resource type', async () => {
    const { service, storage } = buildService(makeDoc());
    await service.deleteDocument({
      role: UserRole.ADMIN,
      userId: 'admin_1',
      propertyId: 'prop_1',
      documentId: 'doc_1',
    });

    expect(storage.delete).toHaveBeenCalledWith(
      'laugh-lodge/property-documents/prop_1/abc',
      expect.objectContaining({ mimeType: 'application/pdf', resourceType: 'raw' }),
    );
  });
});
