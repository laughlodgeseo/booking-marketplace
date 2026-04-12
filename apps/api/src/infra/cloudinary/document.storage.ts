import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.service';

export const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, _file: Express.Multer.File) => ({
    folder: 'vendor_documents',
    resource_type: 'auto',
    format: undefined,
    public_id: `doc-${Date.now()}-${randomUUID()}`,
  }),
});
