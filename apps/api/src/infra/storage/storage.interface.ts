/**
 * Abstract storage interface.
 *
 * All adapters (local, Cloudinary, S3) must implement this contract.
 * Feature modules depend on StorageService (which delegates to an adapter),
 * never on a specific adapter directly.
 */

export interface UploadedFile {
  /** Unique identifier within the storage provider. */
  key: string;
  /** Public URL (for images) or null (for private documents). */
  url: string | null;
  /** MIME type of the stored file. */
  mimeType: string;
  /** File size in bytes. */
  size: number;
  /** Provider name for traceability. */
  provider: 'local' | 'cloudinary' | 's3';
}

export interface UploadOptions {
  /** Destination folder / bucket prefix. */
  folder?: string;
  /** If true, the file should not be publicly accessible. */
  isPrivate?: boolean;
  /** Original filename (for display purposes). */
  originalName?: string;
  /** MIME type override. */
  mimeType?: string;
}

export interface SignedUrlOptions {
  /** How long the URL is valid for, in seconds. Default: 3600. */
  expiresInSeconds?: number;
}

export interface IStorageAdapter {
  /**
   * Upload a file buffer to storage.
   * Returns the stored file metadata including its key and URL.
   */
  upload(buffer: Buffer, options?: UploadOptions): Promise<UploadedFile>;

  /**
   * Delete a file by its storage key.
   */
  delete(key: string): Promise<void>;

  /**
   * Generate a signed (time-limited) URL for private file access.
   * For public files, this may return the permanent URL.
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Check whether the adapter is available (provider reachable).
   */
  isAvailable(): Promise<boolean>;
}
