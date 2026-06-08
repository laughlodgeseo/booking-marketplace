import { BadRequestException } from '@nestjs/common';
import { PropertyDocumentType, PropertyStatus } from '@prisma/client';
import { VendorPropertiesService } from './vendor-properties.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { StorageService } from '../infra/storage/storage.service';

function makeFile(): Express.Multer.File {
  return {
    buffer: Buffer.from('pdf'),
    mimetype: 'application/pdf',
    originalname: 'lease.pdf',
    fieldname: 'document',
    encoding: '7bit',
    size: 3,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

function buildService(params?: { uploadError?: Error; txError?: Error }) {
  const prisma = {
    property: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'prop_1',
        vendorId: 'vendor_1',
        status: PropertyStatus.DRAFT,
        media: [],
        documentPublicId: null,
        documentResourceType: null,
      }),
    },
    propertyDocument: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (fn: Function) => {
      if (params?.txError) throw params.txError;
      return fn({
        propertyDocument: {
          create: jest.fn().mockResolvedValue({ id: 'doc_1' }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        property: {
          update: jest.fn().mockResolvedValue({ id: 'prop_1' }),
        },
      });
    }),
  } as unknown as PrismaService;
  const storage = {
    upload: jest.fn().mockImplementation(() => {
      if (params?.uploadError) return Promise.reject(params.uploadError);
      return Promise.resolve({
        key: 'laugh-lodge/property-documents/prop_1/abc',
        url: null,
        mimeType: 'application/pdf',
        size: 3,
        provider: 'cloudinary',
        resourceType: 'raw',
        deliveryType: 'authenticated',
      });
    }),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;

  const service = new VendorPropertiesService(prisma, {} as never, storage);
  return { service, prisma, storage };
}

describe('VendorPropertiesService.addDocument()', () => {
  it('does not create a DB record when Cloudinary upload fails', async () => {
    const { service, prisma } = buildService({
      uploadError: new Error('Cloudinary upload failed'),
    });

    await expect(
      service.addDocument('vendor_1', 'prop_1', { type: PropertyDocumentType.OWNER_ID }, makeFile()),
    ).rejects.toThrow('Cloudinary upload failed');

    expect((prisma.$transaction as jest.Mock)).not.toHaveBeenCalled();
  });

  it('cleans up Cloudinary when the DB write fails after upload', async () => {
    const { service, storage } = buildService({ txError: new Error('DB failed') });

    await expect(
      service.addDocument('vendor_1', 'prop_1', { type: PropertyDocumentType.OWNER_ID }, makeFile()),
    ).rejects.toThrow('DB failed');

    expect(storage.delete).toHaveBeenCalledWith(
      'laugh-lodge/property-documents/prop_1/abc',
      expect.objectContaining({ mimeType: 'application/pdf', resourceType: 'raw' }),
    );
  });

  it('rejects empty buffers before storage upload', async () => {
    const { service, storage } = buildService();
    const file = { ...makeFile(), buffer: Buffer.alloc(0) };

    await expect(
      service.addDocument('vendor_1', 'prop_1', { type: PropertyDocumentType.OWNER_ID }, file),
    ).rejects.toThrow(BadRequestException);

    expect(storage.upload).not.toHaveBeenCalled();
  });
});
