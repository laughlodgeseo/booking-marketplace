import { PassThrough } from 'stream';
import { v2 as cloudinarySdk } from 'cloudinary';
import { CloudinaryStorageAdapter } from './cloudinary.adapter';

function makeAdapter() {
  process.env.CLOUDINARY_CLOUD_NAME = 'testcloud';
  process.env.CLOUDINARY_API_KEY = 'test_key';
  process.env.CLOUDINARY_API_SECRET = 'test_secret';
  return new CloudinaryStorageAdapter();
}

describe('CloudinaryStorageAdapter.upload()', () => {
  let uploadStreamSpy: jest.SpyInstance;
  let capturedOptions: Record<string, unknown> | null;

  beforeEach(() => {
    capturedOptions = null;
    uploadStreamSpy = jest
      .spyOn(cloudinarySdk.uploader, 'upload_stream')
      .mockImplementation(((options: unknown, callback: unknown) => {
        capturedOptions = options as Record<string, unknown>;
        const stream = new PassThrough();
        stream.on('finish', () => {
          (callback as Function)(null, {
            public_id: 'laugh-lodge/documents/abc123',
            secure_url: 'https://res.cloudinary.com/testcloud/raw/authenticated/abc123',
            bytes: 12,
            format: 'pdf',
            resource_type: capturedOptions?.resource_type,
            type: capturedOptions?.type,
          });
        });
        return stream as never;
      }) as never);
  });

  afterEach(() => {
    uploadStreamSpy.mockRestore();
  });

  it('uploads PDFs as raw/authenticated private assets', async () => {
    const result = await makeAdapter().upload(Buffer.from('pdf'), {
      mimeType: 'application/pdf',
      folder: 'laugh-lodge/property-documents/p1',
      isPrivate: true,
    });

    expect(capturedOptions).toMatchObject({
      resource_type: 'raw',
      type: 'authenticated',
      folder: 'laugh-lodge/property-documents/p1',
    });
    expect(result.resourceType).toBe('raw');
    expect(result.deliveryType).toBe('authenticated');
  });

  it('uploads images as image/authenticated private assets', async () => {
    const result = await makeAdapter().upload(Buffer.from('image'), {
      mimeType: 'image/png',
      folder: 'laugh-lodge/customer-documents/u1',
      isPrivate: true,
    });

    expect(capturedOptions).toMatchObject({
      resource_type: 'image',
      type: 'authenticated',
    });
    expect(result.resourceType).toBe('image');
  });
});
