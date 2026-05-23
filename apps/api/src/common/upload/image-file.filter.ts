import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
]);

export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const mime = (file.mimetype ?? '').toLowerCase().trim();
  const ext =
    (file.originalname ?? '').toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    return callback(
      new BadRequestException(
        `File type '${mime}' is not allowed. Allowed types: JPEG, PNG, WebP, HEIC.`,
      ),
      false,
    );
  }

  if (ext && !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return callback(
      new BadRequestException(
        `File extension '${ext}' is not allowed. Allowed extensions: .jpg, .jpeg, .png, .webp, .heic.`,
      ),
      false,
    );
  }

  callback(null, true);
}
