import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryStorageAdapter } from './cloudinary.adapter';
import { LocalStorageAdapter } from './local.adapter';
import type {
  IStorageAdapter,
  UploadedFile,
  UploadOptions,
  SignedUrlOptions,
} from './storage.interface';

/**
 * StorageService — unified entry point for all file storage operations.
 *
 * Provider selection strategy:
 * 1. If Cloudinary credentials are configured AND the provider is available → use Cloudinary
 * 2. Otherwise → fall back to local filesystem (dev-safe)
 *
 * All callers use StorageService.upload() / .delete() / .getSignedUrl()
 * and are completely decoupled from the underlying provider.
 *
 * Future: add an S3 adapter and update the selection logic here.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private resolvedAdapter: IStorageAdapter | null = null;

  constructor(
    private readonly cloudinary: CloudinaryStorageAdapter,
    private readonly local: LocalStorageAdapter,
  ) {}

  /**
   * Upload a file. Provider is selected automatically.
   */
  async upload(buffer: Buffer, options?: UploadOptions): Promise<UploadedFile> {
    const adapter = await this.getAdapter();
    return adapter.upload(buffer, options);
  }

  /**
   * Delete a file by its storage key.
   * The key encodes the provider in its prefix (local path vs Cloudinary public_id).
   */
  async delete(key: string): Promise<void> {
    const adapter = this.inferAdapterFromKey(key);
    return adapter.delete(key);
  }

  /**
   * Generate a signed URL for private file access.
   */
  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const adapter = this.inferAdapterFromKey(key);
    return adapter.getSignedUrl(key, options);
  }

  /**
   * Returns which provider is currently active.
   */
  async activeProvider(): Promise<'local' | 'cloudinary' | 's3'> {
    const adapter = await this.getAdapter();
    if (adapter === this.cloudinary) return 'cloudinary';
    return 'local';
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getAdapter(): Promise<IStorageAdapter> {
    if (this.resolvedAdapter) return this.resolvedAdapter;

    if (await this.cloudinary.isAvailable()) {
      this.logger.log('StorageService: using Cloudinary adapter');
      this.resolvedAdapter = this.cloudinary;
    } else {
      this.logger.log('StorageService: using local filesystem adapter');
      this.resolvedAdapter = this.local;
    }
    return this.resolvedAdapter;
  }

  /**
   * Infer which adapter to use for delete/getSignedUrl based on the key format.
   * - Local keys start with 'uploads/' or 'private_uploads/'
   * - Cloudinary keys are prefixed with the cloud folder (no leading slash)
   */
  private inferAdapterFromKey(key: string): IStorageAdapter {
    if (key.startsWith('uploads/') || key.startsWith('private_uploads/')) {
      return this.local;
    }
    return this.cloudinary;
  }
}
