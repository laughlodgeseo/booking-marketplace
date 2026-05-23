/**
 * P0 Hardening Tests — Admin Portal Document Path Traversal
 *
 * Tests:
 * 1. ../../etc/passwd storageKey → 400
 * 2. Absolute path storageKey → 400
 * 3. Windows-style traversal → 400
 * 4. Valid storageKey → resolves correctly (no exception)
 */
import { BadRequestException } from '@nestjs/common';
import { sep, join, resolve } from 'path';

// Extract the assertSafeStorageKey logic directly for unit testing
function assertSafeStorageKey(storageKey: string, baseDir: string): void {
  if (
    storageKey.includes('..') ||
    storageKey.includes('\\') ||
    storageKey.startsWith('/') ||
    /^[a-zA-Z]:/.test(storageKey)
  ) {
    throw new BadRequestException('Invalid document path.');
  }

  const resolved = resolve(join(baseDir, storageKey));
  const base = resolve(baseDir);

  if (!resolved.startsWith(base + sep)) {
    throw new BadRequestException('Invalid document path.');
  }
}

describe('FIX-008 — Document path traversal guard', () => {
  const BASE_DIR = '/private_uploads/bookings/documents';

  it('rejects ../../etc/passwd traversal', () => {
    expect(() => assertSafeStorageKey('../../etc/passwd', BASE_DIR)).toThrow(
      BadRequestException,
    );
  });

  it('rejects ../../../windows/system32/config traversal', () => {
    expect(() =>
      assertSafeStorageKey('../../../windows/system32/config', BASE_DIR),
    ).toThrow(BadRequestException);
  });

  it('rejects absolute Unix path', () => {
    expect(() => assertSafeStorageKey('/etc/passwd', BASE_DIR)).toThrow(
      BadRequestException,
    );
  });

  it('rejects absolute Windows path', () => {
    expect(() =>
      assertSafeStorageKey('C:\\Windows\\System32\\config', BASE_DIR),
    ).toThrow(BadRequestException);
  });

  it('rejects Windows-style backslash traversal', () => {
    expect(() => assertSafeStorageKey('..\\..\\etc\\passwd', BASE_DIR)).toThrow(
      BadRequestException,
    );
  });

  it('rejects nested path traversal with valid prefix', () => {
    expect(() =>
      assertSafeStorageKey('valid-prefix/../../etc/passwd', BASE_DIR),
    ).toThrow(BadRequestException);
  });

  it('allows valid storageKey (UUID filename)', () => {
    expect(() =>
      assertSafeStorageKey(
        '550e8400-e29b-41d4-a716-446655440000.pdf',
        BASE_DIR,
      ),
    ).not.toThrow();
  });

  it('allows valid storageKey with subdirectory', () => {
    expect(() =>
      assertSafeStorageKey('2026/05/document.pdf', BASE_DIR),
    ).not.toThrow();
  });
});
