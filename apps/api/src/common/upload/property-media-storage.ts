import { createHash, randomUUID } from 'crypto';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { extname } from 'path';

type UploadScope = 'admin' | 'vendor' | 'seed';

type ResolvePropertyImageUrlInput = {
  file: Express.Multer.File;
  propertyId: string;
  scope: UploadScope;
};

type CloudinaryConfig = {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
  baseFolder: string;
};

const DEFAULT_MEDIA_FOLDER = 'booking-marketplace/properties';

function trimEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function normalizeFolder(folder: string): string {
  return folder.replace(/^\/+|\/+$/g, '');
}

function normalizeSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'property';
}

function loadCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = trimEnv('CLOUDINARY_CLOUD_NAME');
  if (!cloudName) return null;

  const apiKey = trimEnv('CLOUDINARY_API_KEY');
  const apiSecret = trimEnv('CLOUDINARY_API_SECRET');
  const uploadPreset = trimEnv('CLOUDINARY_UPLOAD_PRESET');

  const hasSignedCredentials = Boolean(apiKey && apiSecret);
  const hasUnsignedPreset = Boolean(uploadPreset);
  if (!hasSignedCredentials && !hasUnsignedPreset) {
    return null;
  }

  const configuredFolder =
    trimEnv('CLOUDINARY_PROPERTY_MEDIA_FOLDER') ?? DEFAULT_MEDIA_FOLDER;

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
    baseFolder: normalizeFolder(configuredFolder) || DEFAULT_MEDIA_FOLDER,
  };
}

function cloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const serialized = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

function localPropertyImageUrl(file: Express.Multer.File): string {
  const filename = file.filename?.trim();
  if (!filename) {
    throw new Error('Uploaded image filename is missing.');
  }
  return `/uploads/properties/images/${filename}`;
}

function readUploadBytes(file: Express.Multer.File): Buffer {
  if (file.buffer && file.buffer.byteLength > 0) {
    return file.buffer;
  }

  const absolutePath = file.path?.trim();
  if (absolutePath && existsSync(absolutePath)) {
    return readFileSync(absolutePath);
  }

  throw new Error('Uploaded image payload is missing.');
}

function cleanupLocalUpload(file: Express.Multer.File): void {
  const absolutePath = file.path?.trim();
  if (!absolutePath || !existsSync(absolutePath)) return;
  try {
    unlinkSync(absolutePath);
  } catch {
    // Best-effort cleanup only.
  }
}

function extensionForUpload(file: Express.Multer.File): string {
  const ext = extname(file.originalname || file.filename || '.jpg')
    .toLowerCase()
    .trim();
  if (!ext || ext.length > 8) return '.jpg';
  return ext.startsWith('.') ? ext : `.${ext}`;
}

export async function resolvePropertyImageUrl(
  input: ResolvePropertyImageUrlInput,
): Promise<string> {
  const cfg = loadCloudinaryConfig();
  if (!cfg) {
    return localPropertyImageUrl(input.file);
  }

  const bytes = readUploadBytes(input.file);
  const timestamp = Math.floor(Date.now() / 1000);
  const ext = extensionForUpload(input.file);
  const propertySegment = normalizeSegment(input.propertyId);
  const folder = `${cfg.baseFolder}/${input.scope}/${propertySegment}`;
  const publicId = `${input.scope}-${propertySegment}-${randomUUID()}`;
  const blobBytes = Uint8Array.from(bytes);

  const form = new FormData();
  form.append(
    'file',
    new Blob([blobBytes], {
      type: input.file.mimetype || 'application/octet-stream',
    }),
    `${publicId}${ext}`,
  );
  form.append('folder', folder);
  form.append('public_id', publicId);

  if (cfg.uploadPreset) {
    form.append('upload_preset', cfg.uploadPreset);
  }

  if (cfg.apiKey && cfg.apiSecret) {
    form.append('api_key', cfg.apiKey);
    form.append('timestamp', String(timestamp));
    form.append(
      'signature',
      cloudinarySignature(
        {
          folder,
          public_id: publicId,
          timestamp,
        },
        cfg.apiSecret,
      ),
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Cloudinary upload failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    secure_url?: unknown;
    url?: unknown;
  } | null;

  const secureUrl =
    typeof payload?.secure_url === 'string' && payload.secure_url.trim()
      ? payload.secure_url.trim()
      : typeof payload?.url === 'string' && payload.url.trim()
        ? payload.url.trim()
        : null;

  if (!secureUrl) {
    throw new Error('Cloudinary upload did not return a media URL.');
  }

  cleanupLocalUpload(input.file);
  return secureUrl;
}
