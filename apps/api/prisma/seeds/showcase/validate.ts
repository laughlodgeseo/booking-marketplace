import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { DEFAULT_PASSWORD, assertSeed } from './helpers';

export type ShowcaseValidationResult = {
  counts: Record<string, number>;
  cloudinaryUrlCount: number;
  loginChecks: Array<{ email: string; ok: boolean }>;
  sampledImageChecks: Array<{ url: string; ok: boolean; status?: number }>;
};

export async function validateShowcaseSeed(
  prisma: PrismaClient,
): Promise<ShowcaseValidationResult> {
  const counts = {
    users: await prisma.user.count(),
    vendors: await prisma.vendorProfile.count(),
    properties: await prisma.property.count(),
    publishedProperties: await prisma.property.count({
      where: { status: 'PUBLISHED' },
    }),
    media: await prisma.media.count(),
    bookings: await prisma.booking.count(),
    reviews: await prisma.guestReview.count(),
    wishlistItems: await prisma.wishlistItem.count(),
    messageThreads: await prisma.messageThread.count(),
    messages: await prisma.message.count(),
    notifications: await prisma.notificationEvent.count(),
    payments: await prisma.payment.count(),
    opsTasks: await prisma.opsTask.count(),
  };

  assertSeed(
    counts.users >= 44,
    `Expected at least 44 users, found ${counts.users}.`,
  );
  assertSeed(
    counts.vendors >= 10,
    `Expected at least 10 vendors, found ${counts.vendors}.`,
  );
  assertSeed(
    counts.properties >= 50,
    `Expected at least 50 properties, found ${counts.properties}.`,
  );
  assertSeed(
    counts.media >= counts.properties * 5,
    `Expected 5+ media rows per property, found ${counts.media}.`,
  );
  assertSeed(
    counts.bookings >= 100,
    `Expected 100+ bookings, found ${counts.bookings}.`,
  );
  assertSeed(
    counts.reviews >= 200,
    `Expected 200+ reviews, found ${counts.reviews}.`,
  );

  const nonCloudinaryMedia = await prisma.media.count({
    where: { url: { not: { contains: 'res.cloudinary.com' } } },
  });
  assertSeed(
    nonCloudinaryMedia === 0,
    `${nonCloudinaryMedia} media rows are not Cloudinary URLs.`,
  );

  const cloudinaryUrlCount = await prisma.media.count({
    where: { url: { contains: 'res.cloudinary.com' } },
  });

  const loginUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'admin@rentpropertyuae.com',
          'vendor.omar.al.mansoori@rentpropertyuae.com',
          'customer.ayaan.khan@rentpropertyuae.com',
        ],
      },
    },
    select: { email: true, passwordHash: true },
  });

  const password = process.env.SEED_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const loginChecks = await Promise.all(
    loginUsers.map(async (user) => ({
      email: user.email,
      ok: await bcrypt.compare(password, user.passwordHash),
    })),
  );
  assertSeed(
    loginChecks.every((check) => check.ok),
    'One or more seeded login checks failed.',
  );

  const sampleMedia = await prisma.media.findMany({
    take: 5,
    orderBy: { sortOrder: 'asc' },
    select: { url: true },
  });

  const sampledImageChecks = await Promise.all(
    sampleMedia.map(async (media) => {
      try {
        const response = await fetch(media.url, { method: 'HEAD' });
        return { url: media.url, ok: response.ok, status: response.status };
      } catch {
        return { url: media.url, ok: false };
      }
    }),
  );
  assertSeed(
    sampledImageChecks.every((check) => check.ok),
    'One or more sampled Cloudinary images failed delivery.',
  );

  return {
    counts,
    cloudinaryUrlCount,
    loginChecks,
    sampledImageChecks,
  };
}
