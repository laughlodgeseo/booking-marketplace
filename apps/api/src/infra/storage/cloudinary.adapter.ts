import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  IStorageAdapter,
  UploadedFile,
  UploadOptions,
  SignedUrlOptions,
} from './storage.interface';

/**
 * Cloudinary storage adapter.
 *
 * Uses the Cloudinary REST API directly (no SDK dependency).
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * to be set in environment.
 *
 * Documents (isPrivate=true) are uploaded with type=authenticated so they
 * require a signed URL to access.
 */
@Injectable()
export class CloudinaryStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(CloudinaryStorageAdapter.name);

  private get cloudName(): string {
    return process.env.CLOUDINARY_CLOUD_NAME ?? '';
  }
  private get apiKey(): string {
    return process.env.CLOUDINARY_API_KEY ?? '';
  }
  private get apiSecret(): string {
    return process.env.CLOUDINARY_API_SECRET ?? '';
  }

  async upload(buffer: Buffer, options?: UploadOptions): Promise<UploadedFile> {
    const folder = options?.folder ?? 'booking-marketplace/misc';
    const isPrivate = options?.isPrivate ?? false;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const resourceType = this.resourceTypeFromMime(options?.mimeType ?? '');

    const paramsToSign: Record<string, string> = {
      folder,
      timestamp,
      ...(isPrivate ? { type: 'authenticated' } : {}),
    };

    const signature = this.sign(paramsToSign);

    const form = new FormData();
    form.append(
      'file',
      new Blob([buffer as unknown as ArrayBuffer], { type: options?.mimeType }),
    );
    form.append('folder', folder);
    form.append('timestamp', timestamp);
    form.append('api_key', this.apiKey);
    form.append('signature', signature);
    if (isPrivate) form.append('type', 'authenticated');

    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;
    const response = await fetch(url, { method: 'POST', body: form });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cloudinary upload failed: ${response.status} ${text}`);
    }

    const result = (await response.json()) as {
      public_id: string;
      secure_url: string;
      bytes: number;
      format: string;
    };

    this.logger.debug(`cloudinary_upload key=${result.public_id}`);

    return {
      key: result.public_id,
      url: isPrivate ? null : result.secure_url,
      mimeType: options?.mimeType ?? `image/${result.format}`,
      size: result.bytes,
      provider: 'cloudinary',
    };
  }

  async delete(key: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign({ public_id: key, timestamp });

    const form = new FormData();
    form.append('public_id', key);
    form.append('timestamp', timestamp);
    form.append('api_key', this.apiKey);
    form.append('signature', signature);

    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;
    await fetch(url, { method: 'POST', body: form });
  }

  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const expiresAt =
      Math.floor(Date.now() / 1000) + (options?.expiresInSeconds ?? 3600);
    const signature = this.sign({
      public_id: key,
      timestamp: expiresAt.toString(),
    });

    return Promise.resolve(
      `https://res.cloudinary.com/${this.cloudName}/image/authenticated/` +
        `s--${signature}--/v${expiresAt}/${key}`,
    );
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(!!(this.cloudName && this.apiKey && this.apiSecret));
  }

  private sign(params: Record<string, string>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return crypto
      .createHash('sha256')
      .update(sorted + this.apiSecret)
      .digest('hex');
  }

  private resourceTypeFromMime(mime: string): 'image' | 'raw' | 'video' {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    return 'raw';
  }
}
