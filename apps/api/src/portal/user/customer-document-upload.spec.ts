/**
 * Unit tests — UserPortalService.uploadCustomerDocument()
 *
 * Verifies upload transaction safety:
 * 1. Throws BadRequestException when file is missing
 * 2. Throws BadRequestException when file buffer is empty
 * 3. Does NOT create a DB row when Cloudinary upload returns empty public_id
 * 4. Attempts Cloudinary cleanup if DB write fails after successful upload
 * 5. Returns valid doc metadata on success
 */
import { BadRequestException } from '@nestjs/common';
import { CustomerDocumentType, UserRole } from '@prisma/client';
import { UserPortalService } from './user-portal.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';

const USER_ID = 'user_upload_test';
const DOC_TYPE = CustomerDocumentType.PASSPORT;

function makeFile(bufferLength = 1024): Express.Multer.File {
  return {
    buffer: Buffer.alloc(bufferLength, 'x'),
    mimetype: 'application/pdf',
    originalname: 'test.pdf',
    fieldname: 'file',
    encoding: '7bit',
    size: bufferLength,
    stream: undefined as unknown as import('stream').Readable,
    destination: '',
    filename: '',
    path: '',
  };
}

function makeUploadedFile(overrides: Partial<{
  key: string;
  size: number;
  resourceType: string;
  deliveryType: string;
}> = {}) {
  return {
    key: 'laugh-lodge/customer-documents/user_1/abc123',
    url: null,
    mimeType: 'application/pdf',
    size: 1024,
    provider: 'cloudinary' as const,
    resourceType: 'raw',
    deliveryType: 'authenticated',
    ...overrides,
  };
}

function makeDocRow() {
  const now = new Date();
  return {
    id: 'doc_new_1',
    userId: USER_ID,
    type: DOC_TYPE,
    status: 'PENDING' as const,
    cloudinaryPublicId: 'laugh-lodge/customer-documents/user_1/abc123',
    sizeBytes: 1024,
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    notes: null,
    reviewNotes: null,
    reviewedAt: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function buildService({
  uploadResult = makeUploadedFile(),
  upsertResult = makeDocRow(),
  uploadError = null as Error | null,
  upsertError = null as Error | null,
} = {}) {
  const storageMock = {
    upload: jest.fn().mockImplementation(() => {
      if (uploadError) return Promise.reject(uploadError);
      return Promise.resolve(uploadResult);
    }),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;

  const prismaMock = {
    customerDocument: {
      upsert: jest.fn().mockImplementation(() => {
        if (upsertError) return Promise.reject(upsertError);
        return Promise.resolve(upsertResult);
      }),
    },
  } as unknown as PrismaService;

  const service = new UserPortalService(prismaMock, storageMock);
  return { service, storage: storageMock, prisma: prismaMock };
}

const baseParams = {
  userId: USER_ID,
  role: UserRole.CUSTOMER,
  type: DOC_TYPE,
};

describe('UserPortalService.uploadCustomerDocument() — safety', () => {
  it('throws BadRequestException when file is missing', async () => {
    const { service } = buildService();
    await expect(
      service.uploadCustomerDocument({ ...baseParams, file: undefined }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when file buffer is empty', async () => {
    const { service } = buildService();
    const emptyFile = makeFile(0);
    await expect(
      service.uploadCustomerDocument({ ...baseParams, file: emptyFile }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when Cloudinary returns empty public_id', async () => {
    const { service } = buildService({
      uploadResult: makeUploadedFile({ key: '', size: 0 }),
    });
    await expect(
      service.uploadCustomerDocument({ ...baseParams, file: makeFile() }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does NOT call prisma.upsert when Cloudinary upload fails', async () => {
    const { service, prisma } = buildService({
      uploadError: new Error('Cloudinary upload failed: 502 Bad Gateway'),
    });
    await expect(
      service.uploadCustomerDocument({ ...baseParams, file: makeFile() }),
    ).rejects.toThrow(/Cloudinary upload failed/);

    expect(
      (prisma.customerDocument as unknown as { upsert: jest.Mock }).upsert,
    ).not.toHaveBeenCalled();
  });

  it('calls storage.delete to clean up Cloudinary asset if DB write fails', async () => {
    const { service, storage } = buildService({
      upsertError: new Error('DB connection lost'),
    });
    await expect(
      service.uploadCustomerDocument({ ...baseParams, file: makeFile() }),
    ).rejects.toThrow('DB connection lost');

    expect((storage.delete as jest.Mock)).toHaveBeenCalledWith(
      makeUploadedFile().key,
      'application/pdf',
    );
  });

  it('returns doc with downloadUrl and viewUrl on success', async () => {
    const { service } = buildService();
    const result = await service.uploadCustomerDocument({
      ...baseParams,
      file: makeFile(),
    });

    expect(result.downloadUrl).toMatch(/\/download$/);
    expect(result.viewUrl).toMatch(/\/view$/);
    expect(result.id).toBe('doc_new_1');
  });
});
