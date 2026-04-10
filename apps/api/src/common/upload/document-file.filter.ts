import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export function documentFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file) {
    return cb(new BadRequestException('No file uploaded.'), false);
  }

  const allowedMime = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ]);

  if (!allowedMime.has(file.mimetype)) {
    return cb(
      new BadRequestException(
        'Invalid document type. Allowed: PDF, JPG, PNG, WEBP, HEIC.',
      ),
      false,
    );
  }

  cb(null, true);
}
