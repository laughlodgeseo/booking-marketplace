import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function extFromUrl(url: string): string {
  const clean = url.split('?')[0];
  const last = clean.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot > 0) return last.slice(dot);
  return '.jpg';
}

@Injectable()
export class PropertyMediaZipService {
  private readonly logger = new Logger(PropertyMediaZipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assertVendorOwnsProperty(vendorId: string, propertyId: string): Promise<void> {
    const prop = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { vendorId: true },
    });
    if (!prop) throw new NotFoundException('Property not found.');
    if (prop.vendorId !== vendorId) throw new ForbiddenException('Not your property.');
  }

  async streamPropertyImagesZip(params: {
    propertyId: string;
    propertySlug: string;
    res: Response;
  }): Promise<void> {
    const { propertyId, propertySlug, res } = params;

    const mediaItems = await this.prisma.media.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, url: true, isCover: true, sortOrder: true },
    });

    if (mediaItems.length === 0) {
      throw new BadRequestException('No images found for this property.');
    }

    const safeSlug = slugify(propertySlug || propertyId);
    const zipFilename = `${safeSlug}-images.zip`;

    // Collect all image buffers first to validate before sending headers
    const entries: Array<{ buffer: Buffer; filename: string }> = [];

    for (const item of mediaItems) {
      const label = item.isCover
        ? `${safeSlug}-cover`
        : `${safeSlug}-${String(item.sortOrder + 1).padStart(3, '0')}`;
      const ext = extFromUrl(item.url);
      const filename = `${label}${ext}`;

      try {
        const fetchRes = await fetch(item.url);
        if (!fetchRes.ok) {
          this.logger.warn(`Skipping image ${item.id}: HTTP ${fetchRes.status}`);
          continue;
        }
        const buffer = Buffer.from(await fetchRes.arrayBuffer());
        entries.push({ buffer, filename });
      } catch (err) {
        this.logger.warn(
          `Skipping image ${item.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (entries.length === 0) {
      throw new BadRequestException('Could not fetch any property images.');
    }

    // Build a ZIP archive in memory using Node.js zlib
    const { createGzip } = await import('zlib');
    void createGzip; // unused — using simple store zip

    // Use a manual zip approach with the 'archiver' ESM package
    const { ZipArchive } = await import('archiver');
    const archive = new ZipArchive({ zlib: { level: 6 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    archive.on('error', (err: Error) => {
      this.logger.error(`Archiver error: ${err.message}`);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });

    archive.pipe(res);

    for (const { buffer, filename } of entries) {
      archive.append(buffer, { name: filename });
    }

    await archive.finalize();
  }
}
