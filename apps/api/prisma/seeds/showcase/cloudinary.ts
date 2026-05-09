import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';

import { SHOWCASE_SEED_TAG, assertSeed } from './helpers';

export type UploadedCloudinaryAsset = {
  sourceUrl: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: string;
};

type UploadRequest = {
  sourceUrl: string;
  publicId: string;
  folder: string;
  context?: Record<string, string>;
};

type CloudinaryUploaderOptions = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  cachePath: string;
  dryRun: boolean;
  forceUpload: boolean;
};

type CacheFile = {
  version: string;
  assets: Record<string, UploadedCloudinaryAsset>;
};

export class ShowcaseCloudinaryUploader {
  private readonly cache = new Map<string, UploadedCloudinaryAsset>();

  uploaded = 0;
  reused = 0;

  constructor(private readonly options: CloudinaryUploaderOptions) {
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });

    this.loadCache();
  }

  async uploadImage(request: UploadRequest): Promise<UploadedCloudinaryAsset> {
    const cacheKey = `${request.folder}/${request.publicId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && !this.options.forceUpload) {
      this.reused += 1;
      return cached;
    }

    if (this.options.dryRun) {
      const fake = this.fakeAsset(request);
      this.cache.set(cacheKey, fake);
      this.reused += 1;
      return fake;
    }

    const buffer = await this.fetchImage(request.sourceUrl);
    const response = await this.uploadBuffer(buffer, request);
    const asset: UploadedCloudinaryAsset = {
      sourceUrl: request.sourceUrl,
      publicId: response.public_id,
      secureUrl: response.secure_url,
      width: response.width,
      height: response.height,
      format: response.format,
      bytes: response.bytes,
      resourceType: response.resource_type,
    };

    this.cache.set(cacheKey, asset);
    this.uploaded += 1;
    this.saveCache();

    return asset;
  }

  saveCache(): void {
    mkdirSync(dirname(this.options.cachePath), { recursive: true });
    const payload: CacheFile = {
      version: SHOWCASE_SEED_TAG,
      assets: Object.fromEntries(this.cache),
    };
    writeFileSync(
      this.options.cachePath,
      `${JSON.stringify(payload, null, 2)}\n`,
    );
  }

  private loadCache(): void {
    if (!existsSync(this.options.cachePath)) return;

    const payload = JSON.parse(
      readFileSync(this.options.cachePath, 'utf8'),
    ) as CacheFile;
    if (payload.version !== SHOWCASE_SEED_TAG) return;

    for (const [key, asset] of Object.entries(payload.assets ?? {})) {
      this.cache.set(key, asset);
    }
  }

  private async fetchImage(sourceUrl: string): Promise<Buffer> {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'booking-marketplace-showcase-seed/1.0',
      },
    });

    assertSeed(
      response.ok,
      `Image source failed (${response.status}) for ${sourceUrl}`,
    );

    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  }

  private uploadBuffer(
    buffer: Buffer,
    request: UploadRequest,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: request.folder,
          public_id: request.publicId,
          resource_type: 'image',
          overwrite: true,
          unique_filename: false,
          use_filename: false,
          tags: [SHOWCASE_SEED_TAG, 'booking-marketplace', 'uae-property'],
          context: {
            source_hash: createHash('sha1')
              .update(request.sourceUrl)
              .digest('hex'),
            ...(request.context ?? {}),
          },
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('Cloudinary upload returned no secure_url.'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  private fakeAsset(request: UploadRequest): UploadedCloudinaryAsset {
    const publicId = `${request.folder}/${request.publicId}`;
    return {
      sourceUrl: request.sourceUrl,
      publicId,
      secureUrl: `https://res.cloudinary.com/${this.options.cloudName}/image/upload/v1/${publicId}.jpg`,
      width: 1800,
      height: 1200,
      format: 'jpg',
      bytes: 450000,
      resourceType: 'image',
    };
  }
}

export function cloudinaryCachePath(): string {
  return join(process.cwd(), 'prisma', '.cache', 'showcase-cloudinary.json');
}
