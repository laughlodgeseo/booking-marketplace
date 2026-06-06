/**
 * Unit tests — CloudinaryStorageAdapter.delete()
 *
 * Verifies that the correct Cloudinary resource-type endpoint is chosen
 * depending on the MIME type of the document being deleted, and that the
 * adapter behaves correctly when the asset is already gone (idempotent)
 * or when the API returns an unexpected error.
 */
import { CloudinaryStorageAdapter } from './cloudinary.adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAdapter() {
  process.env.CLOUDINARY_CLOUD_NAME = 'testcloud';
  process.env.CLOUDINARY_API_KEY = 'test_key';
  process.env.CLOUDINARY_API_SECRET = 'test_secret';
  return new CloudinaryStorageAdapter();
}

function okResponse(result: string) {
  return Promise.resolve(
    new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function errorResponse(status: number, body: string) {
  return Promise.resolve(new Response(body, { status }));
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('CloudinaryStorageAdapter.delete()', () => {
  const PUBLIC_KEY = 'laugh-lodge/customer-documents/user_1/abc123';

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => okResponse('ok'));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('calls /image/destroy for an image MIME type', async () => {
    const adapter = makeAdapter();
    await adapter.delete(PUBLIC_KEY, 'image/jpeg');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0] as [string, unknown];
    expect(url).toContain('/image/destroy');
  });

  it('calls /image/destroy for image/png', async () => {
    const adapter = makeAdapter();
    await adapter.delete(PUBLIC_KEY, 'image/png');

    const [url] = fetchSpy.mock.calls[0] as [string, unknown];
    expect(url).toContain('/image/destroy');
  });

  it('calls /raw/destroy for application/pdf', async () => {
    const adapter = makeAdapter();
    await adapter.delete(PUBLIC_KEY, 'application/pdf');

    const [url] = fetchSpy.mock.calls[0] as [string, unknown];
    expect(url).toContain('/raw/destroy');
  });

  it('falls back to /raw/destroy when mimeType is omitted', async () => {
    const adapter = makeAdapter();
    await adapter.delete(PUBLIC_KEY);

    const [url] = fetchSpy.mock.calls[0] as [string, unknown];
    expect(url).toContain('/raw/destroy');
  });

  it('does NOT throw when Cloudinary returns result: "not found" (idempotent)', async () => {
    fetchSpy.mockImplementation(() => okResponse('not found'));
    const adapter = makeAdapter();
    await expect(adapter.delete(PUBLIC_KEY, 'image/jpeg')).resolves.toBeUndefined();
  });

  it('throws when Cloudinary returns a non-2xx HTTP status', async () => {
    fetchSpy.mockImplementation(() =>
      errorResponse(401, 'Unauthorized'),
    );
    const adapter = makeAdapter();
    await expect(adapter.delete(PUBLIC_KEY, 'image/jpeg')).rejects.toThrow(
      /Cloudinary delete failed: 401/,
    );
  });

  it('includes the Cloudinary public_id in the request body', async () => {
    const adapter = makeAdapter();
    await adapter.delete(PUBLIC_KEY, 'application/pdf');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const form = init.body as FormData;
    expect(form.get('public_id')).toBe(PUBLIC_KEY);
  });
});
