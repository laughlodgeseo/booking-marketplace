import { PrismaClient } from '@prisma/client';

import { ShowcaseCloudinaryUploader, cloudinaryCachePath } from './cloudinary';
import {
  assertSeed,
  maskedDatabaseTarget,
  optionalIntEnv,
  requireEnv,
} from './helpers';
import { seedShowcaseData } from './seeders';
import { validateShowcaseSeed } from './validate';

function readBoolean(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'y'].includes(raw);
}

function printBanner(params: {
  dryRun: boolean;
  databaseUrl: string;
  propertyCount: number;
}): void {
  // eslint-disable-next-line no-console
  console.log('============================================================');
  // eslint-disable-next-line no-console
  console.log(' SHOWCASE SEED MODE: UAE / Dubai production-quality dataset ');
  // eslint-disable-next-line no-console
  console.log(' Existing relational data will be replaced after validation ');
  // eslint-disable-next-line no-console
  console.log('============================================================');
  // eslint-disable-next-line no-console
  console.log(`[showcase-seed] dryRun=${params.dryRun}`);
  // eslint-disable-next-line no-console
  console.log(`[showcase-seed] propertyCount=${params.propertyCount}`);
  // eslint-disable-next-line no-console
  console.log(
    `[showcase-seed] target=${maskedDatabaseTarget(params.databaseUrl)}`,
  );
}

export async function runShowcaseSeed(): Promise<void> {
  const dryRun = readBoolean('SHOWCASE_SEED_DRY_RUN');
  const allowReplace = readBoolean('SHOWCASE_SEED_ALLOW_REPLACE');
  const databaseUrl = requireEnv('DATABASE_URL');
  const propertyCount = optionalIntEnv('SHOWCASE_PROPERTY_COUNT', 60);

  assertSeed(
    propertyCount >= 50 && propertyCount <= 80,
    'SHOWCASE_PROPERTY_COUNT must be between 50 and 80.',
  );

  if (!dryRun) {
    assertSeed(
      allowReplace,
      'Destructive reseed blocked. Set SHOWCASE_SEED_ALLOW_REPLACE=true.',
    );
  }

  const cloudName = requireEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = requireEnv('CLOUDINARY_API_KEY');
  const apiSecret = requireEnv('CLOUDINARY_API_SECRET');
  const cloudinaryPropertyFolder =
    process.env.CLOUDINARY_PROPERTY_MEDIA_FOLDER?.trim() ||
    'booking-marketplace/properties';

  printBanner({ dryRun, databaseUrl, propertyCount });

  const uploader = new ShowcaseCloudinaryUploader({
    cloudName,
    apiKey,
    apiSecret,
    cachePath: cloudinaryCachePath(),
    dryRun,
    forceUpload: readBoolean('SHOWCASE_SEED_FORCE_CLOUDINARY_UPLOAD'),
  });

  const prisma = new PrismaClient();
  try {
    const summary = await seedShowcaseData({
      prisma,
      uploader,
      options: {
        propertyCount,
        dryRun,
        cloudinaryPropertyFolder,
      },
    });

    // eslint-disable-next-line no-console
    console.log('[showcase-seed] generated summary:', summary);

    if (!dryRun) {
      const validation = await validateShowcaseSeed(prisma);
      // eslint-disable-next-line no-console
      console.log('[showcase-seed] validation:', validation);
    }
  } finally {
    await prisma.$disconnect();
  }
}
