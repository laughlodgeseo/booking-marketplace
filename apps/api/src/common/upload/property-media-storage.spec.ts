import { createHash } from 'crypto';

import { getCloudinaryUploadParams } from './property-media-storage';

describe('getCloudinaryUploadParams', () => {
  const cloudinaryEnvKeys = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_UPLOAD_PRESET',
    'CLOUDINARY_PROPERTY_MEDIA_FOLDER',
  ] as const;

  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of cloudinaryEnvKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('signs every Cloudinary upload parameter sent by the browser', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_600);
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    process.env.CLOUDINARY_API_KEY = 'demo-key';
    process.env.CLOUDINARY_API_SECRET = 'demo-secret';
    process.env.CLOUDINARY_UPLOAD_PRESET = 'property_signed_preset';
    process.env.CLOUDINARY_PROPERTY_MEDIA_FOLDER =
      '/booking-marketplace/properties/';

    const params = getCloudinaryUploadParams('My Property/42', 'vendor');

    expect(params.mode).toBe('cloudinary');
    if (params.mode !== 'cloudinary') {
      throw new Error('Expected Cloudinary upload params.');
    }

    expect(params.folder).toBe(
      'booking-marketplace/properties/vendor/my-property-42',
    );
    expect(params.timestamp).toBe(1_700_000_001);
    expect(params.uploadPreset).toBe('property_signed_preset');

    const stringToSign =
      `folder=${params.folder}` +
      `&public_id=${params.publicId}` +
      `&timestamp=${params.timestamp}` +
      `&upload_preset=${params.uploadPreset}`;
    const expectedSignature = createHash('sha1')
      .update(`${stringToSign}${process.env.CLOUDINARY_API_SECRET}`)
      .digest('hex');

    expect(params.signature).toBe(expectedSignature);
  });
});
