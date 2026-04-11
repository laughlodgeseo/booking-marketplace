import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  IStorageAdapter,
  UploadedFile,
  UploadOptions,
  SignedUrlOptions,
} from './storage.interface';

/**
 * Local filesystem storage adapter.
 *
 * Used in development and as the fallback when no cloud provider is configured.
 * Private files are stored under `private_uploads/`; public files under `uploads/`.
 *
 * NOTE: Not suitable for multi-instance deployments — each server has its own disk.
 */
@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);

  upload(buffer: Buffer, options?: UploadOptions): Promise<UploadedFile> {
    const folder = options?.folder ?? 'uploads/misc';
    const isPrivate = options?.isPrivate ?? false;
    const baseDir = isPrivate ? 'private_uploads' : 'uploads';
    const ext = this.extFromMime(
      options?.mimeType ?? 'application/octet-stream',
    );
    const fileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;

    const dir = path.join(process.cwd(), baseDir, folder);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);

    const key = `${baseDir}/${folder}/${fileName}`;
    const url = isPrivate ? null : `/${key}`;

    this.logger.debug(`local_upload key=${key} size=${buffer.length}`);

    return Promise.resolve({
      key,
      url,
      mimeType: options?.mimeType ?? 'application/octet-stream',
      size: buffer.length,
      provider: 'local',
    });
  }

  delete(key: string): Promise<void> {
    const filePath = path.join(process.cwd(), key);
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      this.logger.warn(
        `local_delete failed key=${key}: ${(err as Error).message}`,
      );
    }
    return Promise.resolve();
  }

  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    // Local files are served statically — return a path URL with expiry in query string.
    const expiresAt = Date.now() + (options?.expiresInSeconds ?? 3600) * 1000;
    return Promise.resolve(`/${key}?expires=${expiresAt}`);
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true); // local FS is always available
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'application/pdf': '.pdf',
    };
    return map[mime] ?? '';
  }
}
