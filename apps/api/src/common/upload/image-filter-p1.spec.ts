/**
 * P1 Hardening Tests — Image Upload Filter
 *
 * Tests:
 * 1. SVG upload rejected
 * 2. Non-image extension rejected
 * 3. Valid JPEG accepted
 * 4. Valid PNG accepted
 * 5. Valid WebP accepted
 * 6. HTML disguised as image rejected
 */
import { BadRequestException } from '@nestjs/common';
import { imageFileFilter } from './image-file.filter';
import type { Request } from 'express';

function runFilter(
  mimetype: string,
  originalname: string,
): Promise<boolean | Error> {
  return new Promise((resolve) => {
    imageFileFilter(
      {} as Request,
      { mimetype, originalname } as Express.Multer.File,
      (err, accepted) => {
        if (err) resolve(err);
        else resolve(accepted);
      },
    );
  });
}

describe('P1 FIX-UPLOAD — Image file filter allowlist', () => {
  it('rejects SVG (image/svg+xml)', async () => {
    const result = await runFilter('image/svg+xml', 'evil.svg');
    expect(result).toBeInstanceOf(BadRequestException);
  });

  it('rejects GIF (not in allowlist)', async () => {
    const result = await runFilter('image/gif', 'animation.gif');
    expect(result).toBeInstanceOf(BadRequestException);
  });

  it('rejects application/javascript even with .jpg name', async () => {
    const result = await runFilter('application/javascript', 'shell.jpg');
    expect(result).toBeInstanceOf(BadRequestException);
  });

  it('rejects .php extension even with image MIME', async () => {
    const result = await runFilter('image/jpeg', 'shell.php');
    expect(result).toBeInstanceOf(BadRequestException);
  });

  it('accepts image/jpeg', async () => {
    const result = await runFilter('image/jpeg', 'photo.jpg');
    expect(result).toBe(true);
  });

  it('accepts image/png', async () => {
    const result = await runFilter('image/png', 'logo.png');
    expect(result).toBe(true);
  });

  it('accepts image/webp', async () => {
    const result = await runFilter('image/webp', 'optimized.webp');
    expect(result).toBe(true);
  });
});
