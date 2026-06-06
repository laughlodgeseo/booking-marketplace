import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import {
  BOOKING_DOCUMENTS_DIR,
  CUSTOMER_DOCUMENTS_DIR,
  PROPERTY_DOCUMENTS_DIR,
  PROPERTY_IMAGES_DIR,
} from './storage-paths';

const IMAGES_DIR = PROPERTY_IMAGES_DIR;
const DOCS_DIR = PROPERTY_DOCUMENTS_DIR;
const BOOKING_DOCS_DIR = BOOKING_DOCUMENTS_DIR;
const CUSTOMER_DOCS_DIR = CUSTOMER_DOCUMENTS_DIR;

export const imageUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(IMAGES_DIR, { recursive: true });
    cb(null, IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const documentUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(DOCS_DIR, { recursive: true });
    cb(null, DOCS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const bookingDocumentUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(BOOKING_DOCS_DIR, { recursive: true });
    cb(null, BOOKING_DOCS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const customerDocumentUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(CUSTOMER_DOCS_DIR, { recursive: true });
    cb(null, CUSTOMER_DOCS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const customerDocumentMemoryStorage = memoryStorage();
