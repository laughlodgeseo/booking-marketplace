/**
 * Unit tests — CloudinaryStorageAdapter.getSignedUrl()
 *
 * Verifies:
 * 1. PDF signed URL uses resourceType=raw, deliveryType=authenticated
 * 2. Image signed URL uses resourceType=image, deliveryType=authenticated
 * 3. Signed URL format: uses s-- token (8 chars), NOT a 64-char hex hash
 * 4. Defaults to image/authenticated when options are omitted
 * 5. Returns an HTTPS Cloudinary CDN URL
 */
import { CloudinaryStorageAdapter } from './cloudinary.adapter';

function makeAdapter() {
  process.env.CLOUDINARY_CLOUD_NAME = 'testcloud';
  process.env.CLOUDINARY_API_KEY = 'test_key';
  process.env.CLOUDINARY_API_SECRET = 'test_secret_32chars_padding_xyzz';
  return new CloudinaryStorageAdapter();
}

const PUBLIC_ID =
  'laugh-lodge/customer-documents/user_1/abc123xyz';

describe('CloudinaryStorageAdapter.getSignedUrl()', () => {
  let adapter: CloudinaryStorageAdapter;

  beforeEach(() => {
    adapter = makeAdapter();
  });

  it('returns an HTTPS res.cloudinary.com URL', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID, {
      resourceType: 'raw',
      deliveryType: 'authenticated',
    });
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it('embeds the cloud name in the URL', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID);
    expect(url).toContain('/testcloud/');
  });

  it('uses raw/authenticated path segment for PDF documents', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID, {
      resourceType: 'raw',
      deliveryType: 'authenticated',
    });
    expect(url).toContain('/raw/authenticated/');
  });

  it('uses image/authenticated path segment for image documents', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID, {
      resourceType: 'image',
      deliveryType: 'authenticated',
    });
    expect(url).toContain('/image/authenticated/');
  });

  it('defaults to image/authenticated when options are omitted', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID);
    expect(url).toContain('/image/authenticated/');
  });

  it('contains an s-- signature token of exactly 8 characters', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID, {
      resourceType: 'raw',
      deliveryType: 'authenticated',
    });
    // Cloudinary's s-- token must be exactly 8 base64url chars, NOT 64-char hex.
    const match = /s--([A-Za-z0-9_-]+)--/.exec(url);
    expect(match).not.toBeNull();
    const token = match![1];
    expect(token).toHaveLength(8);
    // Must not be a 64-char hex string (the old broken implementation)
    expect(token).not.toMatch(/^[0-9a-f]{64}$/);
  });

  it('embeds the public_id in the URL path', async () => {
    const url = await adapter.getSignedUrl(PUBLIC_ID, {
      resourceType: 'raw',
      deliveryType: 'authenticated',
    });
    expect(url).toContain(PUBLIC_ID);
  });
});
