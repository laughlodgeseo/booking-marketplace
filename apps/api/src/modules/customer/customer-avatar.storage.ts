import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');

export const avatarUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});
