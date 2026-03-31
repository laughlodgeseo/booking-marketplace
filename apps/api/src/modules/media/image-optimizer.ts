import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Image optimization service using sharp.
 * Creates responsive WebP variants and supports on-the-fly optimization.
 */
export interface ImageVariant {
  size: 'thumbnail' | 'medium' | 'large' | 'original';
  path: string;
  width: number;
}

const VARIANTS: Array<{
  size: ImageVariant['size'];
  width: number;
  suffix: string;
}> = [
  { size: 'thumbnail', width: 320, suffix: '_thumb' },
  { size: 'medium', width: 800, suffix: '_med' },
  { size: 'large', width: 1600, suffix: '_lg' },
];

/**
 * Generate image variant paths for a given upload.
 * Returns the paths where variants should be stored.
 */
export function getImageVariantPaths(originalPath: string): ImageVariant[] {
  const ext = path.extname(originalPath);
  const base = originalPath.slice(0, -ext.length);

  const variants: ImageVariant[] = [
    { size: 'original', path: originalPath, width: 0 },
  ];

  for (const variant of VARIANTS) {
    variants.push({
      size: variant.size,
      path: `${base}${variant.suffix}.webp`,
      width: variant.width,
    });
  }

  return variants;
}

/**
 * Generate srcset attribute value for responsive images.
 */
export function generateSrcSet(basePath: string): string {
  const ext = path.extname(basePath);
  const base = basePath.slice(0, -ext.length);

  return [
    `${base}_thumb.webp 320w`,
    `${base}_med.webp 800w`,
    `${base}_lg.webp 1600w`,
  ].join(', ');
}

/**
 * Check if a file is an image based on mime type.
 */
export function isImageMime(mimeType: string): boolean {
  return /^image\/(jpeg|jpg|png|gif|webp|avif|svg\+xml)$/i.test(mimeType);
}

/**
 * Process an input image and create resized WebP variants on disk.
 *
 * @param inputPath  - Absolute path to the uploaded original image.
 * @param outputDir  - Directory where the variant files will be written.
 *                     Defaults to the same directory as the input file.
 * @returns An array of ImageVariant metadata (including the original).
 *          On failure the original is returned as-is so callers always
 *          have at least one usable path.
 */
export async function processImageVariants(
  inputPath: string,
  outputDir?: string,
): Promise<ImageVariant[]> {
  const dir = outputDir ?? path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);

  // Always include the original
  const results: ImageVariant[] = [
    { size: 'original', path: inputPath, width: 0 },
  ];

  try {
    // Ensure output directory exists
    await fs.promises.mkdir(dir, { recursive: true });

    const inputBuffer = await fs.promises.readFile(inputPath);

    for (const variant of VARIANTS) {
      const outputFileName = `${baseName}${variant.suffix}.webp`;
      const outputPath = path.join(dir, outputFileName);

      try {
        await sharp(inputBuffer)
          .resize(variant.width, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .webp({ quality: 80 })
          .toFile(outputPath);

        results.push({
          size: variant.size,
          path: outputPath,
          width: variant.width,
        });
      } catch (variantErr) {
        // If a single variant fails, log and skip it
        console.warn(
          `[image-optimizer] Failed to create ${variant.size} variant for ${inputPath}:`,
          variantErr,
        );
      }
    }
  } catch (err) {
    console.error(
      `[image-optimizer] Failed to process variants for ${inputPath}:`,
      err,
    );
    // Return only the original as a fallback
  }

  return results;
}

/**
 * Optimize an image buffer on the fly (useful for API responses / CDN).
 *
 * @param inputBuffer - Raw image bytes.
 * @param width       - Target width in pixels.
 * @param format      - Output format, defaults to 'webp'.
 * @returns The optimized image buffer. On failure the original buffer is
 *          returned unchanged so the caller always has something to serve.
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  width: number,
  format: 'webp' | 'jpeg' = 'webp',
): Promise<Buffer> {
  try {
    let pipeline = sharp(inputBuffer).resize(width, null, {
      withoutEnlargement: true,
      fit: 'inside',
    });

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality: 80 });
    } else {
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
    }

    return await pipeline.toBuffer();
  } catch (err) {
    console.error('[image-optimizer] On-the-fly optimization failed:', err);
    return inputBuffer;
  }
}
