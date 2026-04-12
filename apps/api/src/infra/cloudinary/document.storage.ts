import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
  };
};

export const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req: AuthenticatedRequest) => {
    const vendorId =
      typeof req.user?.id === 'string' && req.user.id.trim().length > 0
        ? req.user.id.trim()
        : 'unknown';

    return {
      folder: 'vendor_documents',
      resource_type: 'raw',
      format: undefined,
      public_id: `vendor-${vendorId}-${randomUUID()}`,
    };
  },
});
