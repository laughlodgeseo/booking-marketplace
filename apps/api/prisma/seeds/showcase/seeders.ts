import { faker } from '@faker-js/faker';
import {
  ActivationInvoiceStatus,
  BlockRequestStatus,
  BookingPaymentStatus,
  BookingStatus,
  CalendarDayStatus,
  CancellationActor,
  CancellationMode,
  CancellationReason,
  FxQuoteCurrency,
  GuestReviewStatus,
  HoldStatus,
  LedgerDirection,
  LedgerEntryType,
  MaintenancePriority,
  MaintenanceStatus,
  MessageCounterpartyRole,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  OpsTaskStatus,
  OpsTaskType,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  PayoutStatus,
  PricingRuleType,
  Prisma,
  PrismaClient,
  PropertyActivationPaymentStatus,
  PropertyMediaCategory,
  PropertyReviewDecision,
  PropertyStatus,
  RefundReason,
  RefundStatus,
  SecurityDepositMode,
  SecurityDepositStatus,
  ServicePlanType,
  UserRole,
  VendorAgreementStatus,
  VendorStatementStatus,
  VendorStatus,
  WorkOrderStatus,
} from '@prisma/client';

import { hashPassword } from '../../../src/common/security/password';
import { ShowcaseCloudinaryUploader } from './cloudinary';
import { cleanupShowcaseData } from './cleanup';
import {
  ADMIN_PEOPLE,
  AMENITIES,
  AMENITY_GROUPS,
  CUSTOMER_PEOPLE,
  HOST_RESPONSES,
  IMAGE_SOURCES,
  MEDIA_CATEGORY_PLAN,
  MESSAGE_TOPICS,
  PROPERTY_ARCHETYPES,
  REVIEW_SNIPPETS,
  UAE_AREAS,
  VENDOR_PEOPLE,
} from './datasets';
import {
  DEFAULT_PASSWORD,
  SHOWCASE_SEED_TAG,
  SeededRandom,
  addDays,
  addHours,
  assertSeed,
  clamp,
  eachNight,
  initFaker,
  isoDay,
  json,
  nightsBetween,
  roundAed,
  slugify,
  stableUuid,
  toEmailName,
  utcDay,
} from './helpers';

type UserPlan = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone: string;
  bio: string;
  avatarSourceUrl: string;
  avatarUrl?: string;
};

type VendorPlan = {
  userId: string;
  profileId: string;
  displayName: string;
  companyName: string;
  phone: string;
  planCode: string;
};

type PropertyPlan = {
  id: string;
  locationId: string;
  vendorId: string;
  title: string;
  slug: string;
  propertyType: Prisma.PropertyCreateManyInput['propertyType'];
  description: string;
  city: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePrice: number;
  cleaningFee: number;
  minNights: number;
  starRating: number;
  status: PropertyStatus;
  attractions: string[];
  amenityKeys: string[];
  imagePlans: ImagePlan[];
  servicePlanCode: string;
};

type ImagePlan = {
  id: string;
  sourceUrl: string;
  publicId: string;
  folder: string;
  alt: string;
  sortOrder: number;
  category: PropertyMediaCategory;
  secureUrl?: string;
  metadata?: Record<string, string | number>;
};

type BookingPlan = {
  id: string;
  holdId: string;
  paymentId: string;
  customerId: string;
  propertyId: string;
  vendorId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  totalAmount: number;
  breakdown: Record<string, unknown>;
  createdAt: Date;
};

export type ShowcaseGeneratedPlan = {
  admins: UserPlan[];
  vendors: UserPlan[];
  customers: UserPlan[];
  vendorProfiles: VendorPlan[];
  properties: PropertyPlan[];
  bookings: BookingPlan[];
};

export type ShowcaseSeedOptions = {
  propertyCount: number;
  dryRun: boolean;
  cloudinaryPropertyFolder: string;
};

export type ShowcaseSeedSummary = {
  users: number;
  vendors: number;
  properties: number;
  media: number;
  bookings: number;
  reviews: number;
  wishlists: number;
  messages: number;
  notifications: number;
  uploadedImages: number;
  reusedImages: number;
  sampleAccounts: Array<{ role: string; email: string; password: string }>;
};

const PASSWORD = process.env.SEED_PASSWORD?.trim() || DEFAULT_PASSWORD;
const fakerSeed = 9712026;

export function buildShowcasePlan(
  options: ShowcaseSeedOptions,
): ShowcaseGeneratedPlan {
  initFaker(fakerSeed);
  const random = new SeededRandom(
    `${SHOWCASE_SEED_TAG}:${options.propertyCount}`,
  );
  const admins = buildUserPlans('admin', ADMIN_PEOPLE, UserRole.ADMIN);
  const vendors = buildUserPlans('vendor', VENDOR_PEOPLE, UserRole.VENDOR);
  const customers = buildUserPlans(
    'customer',
    CUSTOMER_PEOPLE,
    UserRole.CUSTOMER,
  );
  const vendorProfiles = vendors.map((vendor, index) => ({
    userId: vendor.id,
    profileId: stableUuid(`showcase-vendor-profile:${vendor.id}`),
    displayName: `${vendor.fullName.split(' ')[0]} ${vendor.fullName.split(' ').slice(-1)[0]} Stays`,
    companyName: `${vendor.fullName.split(' ')[0]} Premium Holiday Homes LLC`,
    phone: vendor.phone,
    planCode: ['FP_FULL', 'FP_SEMI', 'FP_LIST'][index % 3],
  }));

  const properties = buildPropertyPlans({
    count: options.propertyCount,
    vendors,
    vendorProfiles,
    random,
    cloudinaryPropertyFolder: options.cloudinaryPropertyFolder,
  });

  const bookings = buildBookingPlans({
    properties: properties.filter(
      (property) => property.status === PropertyStatus.PUBLISHED,
    ),
    customers,
    random,
  });

  return { admins, vendors, customers, vendorProfiles, properties, bookings };
}

export async function seedShowcaseData(params: {
  prisma: PrismaClient;
  uploader: ShowcaseCloudinaryUploader;
  options: ShowcaseSeedOptions;
}): Promise<ShowcaseSeedSummary> {
  const { prisma, uploader, options } = params;
  const plan = buildShowcasePlan(options);

  if (options.dryRun) {
    return buildSummary(plan, uploader, 0, 0, 0, 0);
  }

  await uploadUserAvatars(uploader, [
    ...plan.admins,
    ...plan.vendors,
    ...plan.customers,
  ]);
  await uploadPropertyImages(uploader, plan.properties);
  await cleanupShowcaseData(prisma);

  const passwordHash = await hashPassword(PASSWORD);

  await prisma.$transaction(
    async (tx) => {
      await seedCatalogs(tx);
      await seedUsers(tx, plan, passwordHash);
      await seedProperties(tx, plan);
    },
    { maxWait: 120_000, timeout: 120_000 },
  );

  await seedBookingsAndOperations(prisma, plan);
  const extras = await seedMarketplaceExtras(prisma, plan);

  return buildSummary(
    plan,
    uploader,
    extras.reviewCount,
    extras.wishlistCount,
    extras.messageCount,
    extras.notificationCount,
  );
}

function buildUserPlans(
  prefix: 'admin' | 'vendor' | 'customer',
  people: Array<{ fullName: string; phone: string; bio: string }>,
  role: UserRole,
): UserPlan[] {
  return people.map((person, index) => {
    const emailPrefix =
      prefix === 'admin'
        ? index === 0
          ? 'admin'
          : 'ops.admin'
        : `${prefix}.${toEmailName(person.fullName)}`;

    return {
      id: stableUuid(`showcase-user:${prefix}:${person.fullName}`),
      email: `${emailPrefix}@rentpropertyuae.com`,
      role,
      fullName: person.fullName,
      phone: person.phone,
      bio: person.bio,
      avatarSourceUrl: `https://i.pravatar.cc/512?img=${(index % 70) + 1}`,
    };
  });
}

function buildPropertyPlans(params: {
  count: number;
  vendors: UserPlan[];
  vendorProfiles: VendorPlan[];
  random: SeededRandom;
  cloudinaryPropertyFolder: string;
}): PropertyPlan[] {
  const plans: PropertyPlan[] = [];

  for (let i = 0; i < params.count; i += 1) {
    const area = UAE_AREAS[i % UAE_AREAS.length];
    const archetypePool =
      area.priceBand === 'budget'
        ? PROPERTY_ARCHETYPES.slice(0, 2)
        : area.priceBand === 'mid'
          ? PROPERTY_ARCHETYPES.slice(0, 3)
          : area.priceBand === 'luxury'
            ? PROPERTY_ARCHETYPES.slice(1, 6)
            : PROPERTY_ARCHETYPES.slice(2, 5);
    const archetype = params.random.pick(archetypePool);
    const vendor = params.vendors[i % params.vendors.length];
    const vendorProfile =
      params.vendorProfiles[i % params.vendorProfiles.length];
    const building = params.random.pick(area.addressHints);
    const descriptor = titleCase(params.random.pick(archetype.descriptors));
    const noun = params.random.pick(archetype.titleNouns);
    const title = uniquePropertyTitle(area.area, descriptor, noun, building, i);
    const slug = `${slugify(`${title}-${area.city}`)}-${String(i + 1).padStart(2, '0')}`;
    const id = stableUuid(`showcase-property:${slug}`);
    const bedrooms =
      archetype.propertyType === 'STUDIO'
        ? params.random.pick([0, 1])
        : params.random.int(archetype.minBedrooms, archetype.maxBedrooms);
    const bathrooms = params.random.int(
      archetype.minBathrooms,
      archetype.maxBathrooms,
    );
    const maxGuests = clamp(
      bedrooms * 2 + params.random.int(1, 3),
      archetype.minGuests,
      archetype.maxGuests,
    );
    const basePrice = params.random.int(
      archetype.basePrice[0],
      archetype.basePrice[1],
    );
    const cleaningFee = params.random.int(
      archetype.cleaningFee[0],
      archetype.cleaningFee[1],
    );
    const status =
      i < Math.floor(params.count * 0.9)
        ? PropertyStatus.PUBLISHED
        : i % 4 === 0
          ? PropertyStatus.UNDER_REVIEW
          : i % 4 === 1
            ? PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT
            : i % 4 === 2
              ? PropertyStatus.DRAFT
              : PropertyStatus.CHANGES_REQUESTED;

    const imageCount =
      status === PropertyStatus.PUBLISHED
        ? params.random.int(5, 8)
        : params.random.int(5, 6);

    plans.push({
      id,
      locationId: stableUuid(`showcase-location:${slug}`),
      vendorId: vendor.id,
      title,
      slug,
      propertyType: archetype.propertyType,
      description: buildDescription({
        area: area.area,
        city: area.city,
        building,
        bedrooms,
        bathrooms,
        maxGuests,
        descriptor: descriptor.toLowerCase(),
        attractions: area.attractions,
        archetypeLabel: archetype.label,
      }),
      city: area.city,
      area: area.area,
      address: `Unit ${faker.number.int({ min: 201, max: 4508 })}, ${building}, ${area.area}, ${area.city}, UAE`,
      lat: Number(
        (area.lat + params.random.float(-0.008, 0.008, 6)).toFixed(6),
      ),
      lng: Number(
        (area.lng + params.random.float(-0.008, 0.008, 6)).toFixed(6),
      ),
      maxGuests,
      bedrooms,
      bathrooms,
      basePrice,
      cleaningFee,
      minNights: params.random.pick([1, 2, 2, 3]),
      starRating: params.random.pick([3, 4, 4, 5]),
      status,
      attractions: area.attractions,
      amenityKeys: buildAmenityKeys(
        archetype.propertyType,
        area.priceBand,
        params.random,
      ),
      servicePlanCode: vendorProfile.planCode,
      imagePlans: buildImagePlans({
        propertyId: id,
        slug,
        title,
        imageCount,
        folder: params.cloudinaryPropertyFolder,
        random: params.random,
      }),
    });
  }

  return plans;
}

function buildBookingPlans(params: {
  properties: PropertyPlan[];
  customers: UserPlan[];
  random: SeededRandom;
}): BookingPlan[] {
  const bookings: BookingPlan[] = [];
  const nextDateByProperty = new Map<string, Date>();
  const bookingStart = utcDay(2025, 9, 1);

  for (let i = 0; i < 200; i += 1) {
    const property = params.properties[i % params.properties.length];
    const customer = params.customers[(i * 7) % params.customers.length];
    const current =
      nextDateByProperty.get(property.id) ?? addDays(bookingStart, i % 9);
    const nights = params.random.int(Math.max(property.minNights, 2), 7);
    const checkIn =
      i < 188 ? current : addDays(utcDay(2026, 5, 9), params.random.int(8, 80));
    const checkOut = addDays(checkIn, nights);
    nextDateByProperty.set(
      property.id,
      addDays(checkOut, params.random.int(4, 11)),
    );

    const status =
      i < 180
        ? BookingStatus.COMPLETED
        : i < 188
          ? BookingStatus.CONFIRMED
          : i < 196
            ? BookingStatus.CANCELLED
            : BookingStatus.PENDING_PAYMENT;
    const paymentStatus =
      status === BookingStatus.PENDING_PAYMENT
        ? BookingPaymentStatus.PENDING
        : status === BookingStatus.CANCELLED
          ? BookingPaymentStatus.SUCCESS
          : BookingPaymentStatus.SUCCESS;

    const adults = clamp(
      params.random.int(1, property.maxGuests),
      1,
      property.maxGuests,
    );
    const children = params.random.chance(0.28)
      ? clamp(
          params.random.int(1, 3),
          0,
          Math.max(0, property.maxGuests - adults),
        )
      : 0;
    const breakdown = priceBreakdown(property, nights, params.random);
    const bookingKey = `showcase-booking:${i}:${property.slug}:${isoDay(checkIn)}`;

    bookings.push({
      id: stableUuid(bookingKey),
      holdId: stableUuid(`${bookingKey}:hold`),
      paymentId: stableUuid(`${bookingKey}:payment`),
      customerId: customer.id,
      propertyId: property.id,
      vendorId: property.vendorId,
      checkIn,
      checkOut,
      adults,
      children,
      status,
      paymentStatus,
      totalAmount: Number(breakdown.total),
      breakdown,
      createdAt: addDays(checkIn, -params.random.int(7, 45)),
    });
  }

  return bookings;
}

async function uploadUserAvatars(
  uploader: ShowcaseCloudinaryUploader,
  users: UserPlan[],
): Promise<void> {
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const asset = await uploader.uploadImage({
      sourceUrl: user.avatarSourceUrl,
      folder: 'booking-marketplace/avatars',
      publicId: slugify(user.email.replace('@', '-')),
      context: { alt: `${user.fullName} profile photo` },
    });
    user.avatarUrl = asset.secureUrl;
    if ((i + 1) % 10 === 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[showcase-seed] avatar uploads staged ${i + 1}/${users.length}`,
      );
    }
  }
}

async function uploadPropertyImages(
  uploader: ShowcaseCloudinaryUploader,
  properties: PropertyPlan[],
): Promise<void> {
  let completed = 0;
  const total = properties.reduce(
    (sum, property) => sum + property.imagePlans.length,
    0,
  );

  for (const property of properties) {
    for (const image of property.imagePlans) {
      const asset = await uploader.uploadImage({
        sourceUrl: image.sourceUrl,
        folder: image.folder,
        publicId: image.publicId,
        context: {
          alt: image.alt,
          category: image.category,
          property_slug: property.slug,
        },
      });
      image.secureUrl = asset.secureUrl;
      image.metadata = {
        public_id: asset.publicId,
        width: asset.width,
        height: asset.height,
        format: asset.format,
        bytes: asset.bytes,
        resource_type: asset.resourceType,
      };
      completed += 1;
      if (completed % 25 === 0 || completed === total) {
        // eslint-disable-next-line no-console
        console.log(
          `[showcase-seed] property images staged ${completed}/${total}`,
        );
      }
    }
  }
}

async function seedCatalogs(tx: Prisma.TransactionClient): Promise<void> {
  await tx.servicePlan.createMany({
    data: [
      {
        id: stableUuid('showcase-service-plan:listing-only'),
        code: 'FP_LIST',
        type: ServicePlanType.LISTING_ONLY,
        name: 'Listing Only',
        description:
          'Marketplace listing, bookings, messaging, and payout tracking.',
        managementFeeBps: 900,
        includesCleaning: false,
        includesLinen: false,
        includesInspection: false,
        includesRestock: false,
        includesMaintenance: false,
        isActive: true,
      },
      {
        id: stableUuid('showcase-service-plan:semi-managed'),
        code: 'FP_SEMI',
        type: ServicePlanType.SEMI_MANAGED,
        name: 'Semi Managed',
        description:
          'Bookings plus essential operations including cleaning, linen, and inspection.',
        managementFeeBps: 1500,
        includesCleaning: true,
        includesLinen: true,
        includesInspection: true,
        includesRestock: false,
        includesMaintenance: true,
        isActive: true,
      },
      {
        id: stableUuid('showcase-service-plan:fully-managed'),
        code: 'FP_FULL',
        type: ServicePlanType.FULLY_MANAGED,
        name: 'Fully Managed',
        description:
          'Premium end-to-end management for guest operations, service tasks, and maintenance.',
        managementFeeBps: 1900,
        includesCleaning: true,
        includesLinen: true,
        includesInspection: true,
        includesRestock: true,
        includesMaintenance: true,
        isActive: true,
      },
    ],
  });

  await tx.amenityGroup.createMany({
    data: AMENITY_GROUPS.map((group) => ({
      id: stableUuid(`showcase-amenity-group:${group.key}`),
      ...group,
      isActive: true,
    })),
  });

  await tx.amenity.createMany({
    data: AMENITIES.map((amenity) => ({
      id: stableUuid(`showcase-amenity:${amenity.key}`),
      key: amenity.key,
      name: amenity.name,
      groupId: stableUuid(`showcase-amenity-group:${amenity.groupKey}`),
      sortOrder: amenity.sortOrder,
      isActive: true,
    })),
  });

  await tx.fxRate.createMany({
    data: [
      {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.USD,
        rate: '0.2723',
        asOfDate: utcDay(2026, 5, 9),
        provider: 'showcase-manual',
      },
      {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.EUR,
        rate: '0.2531',
        asOfDate: utcDay(2026, 5, 9),
        provider: 'showcase-manual',
      },
      {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.GBP,
        rate: '0.2182',
        asOfDate: utcDay(2026, 5, 9),
        provider: 'showcase-manual',
      },
      {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.SAR,
        rate: '1.0211',
        asOfDate: utcDay(2026, 5, 9),
        provider: 'showcase-manual',
      },
    ],
  });
}

async function seedUsers(
  tx: Prisma.TransactionClient,
  plan: ShowcaseGeneratedPlan,
  passwordHash: string,
): Promise<void> {
  const allUsers = [...plan.admins, ...plan.vendors, ...plan.customers];
  await tx.user.createMany({
    data: allUsers.map((user) => ({
      id: user.id,
      email: user.email,
      passwordHash,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl ?? null,
      authProvider: 'local',
      isEmailVerified: true,
      createdAt: addDays(utcDay(2025, 8, 1), allUsers.indexOf(user)),
    })),
  });

  await tx.vendorProfile.createMany({
    data: plan.vendorProfiles.map((profile) => ({
      id: profile.profileId,
      userId: profile.userId,
      displayName: profile.displayName,
      companyName: profile.companyName,
      phone: profile.phone,
      status: VendorStatus.APPROVED,
    })),
  });

  await tx.vendorServiceAgreement.createMany({
    data: plan.vendorProfiles.map((profile, index) => {
      const planId = stableUuid(
        `showcase-service-plan:${servicePlanSlug(profile.planCode)}`,
      );
      return {
        id: stableUuid(`showcase-vendor-agreement:${profile.profileId}`),
        vendorProfileId: profile.profileId,
        servicePlanId: planId,
        status: VendorAgreementStatus.ACTIVE,
        startDate: addDays(utcDay(2025, 8, 1), index),
        agreedManagementFeeBps:
          profile.planCode === 'FP_FULL'
            ? 1900
            : profile.planCode === 'FP_SEMI'
              ? 1500
              : 900,
        notes: 'Showcase seed agreement generated for investor demo data.',
        approvedByAdminId: plan.admins[0].id,
        approvedAt: addDays(utcDay(2025, 8, 1), index + 1),
      };
    }),
  });
}

async function seedProperties(
  tx: Prisma.TransactionClient,
  plan: ShowcaseGeneratedPlan,
): Promise<void> {
  const servicePlanByVendor = new Map(
    plan.vendorProfiles.map((profile) => [profile.userId, profile.planCode]),
  );

  await tx.location.createMany({
    data: plan.properties.map((property) => ({
      id: property.locationId,
      country: 'UAE',
      city: property.city,
      area: property.area,
      name: property.area,
      address: property.address,
      lat: property.lat,
      lng: property.lng,
    })),
  });

  await tx.property.createMany({
    data: plan.properties.map((property, index) => ({
      id: property.id,
      vendorId: property.vendorId,
      createdByAdminId: index % 17 === 0 ? plan.admins[0].id : null,
      title: property.title,
      slug: property.slug,
      propertyType: property.propertyType,
      description: property.description,
      city: property.city,
      area: property.area,
      address: property.address,
      lat: property.lat,
      lng: property.lng,
      locationId: property.locationId,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      basePrice: property.basePrice,
      cleaningFee: property.cleaningFee,
      currency: 'AED',
      starRating: property.starRating,
      minNights: property.minNights,
      maxNights: 45,
      checkInFromMin: 900,
      checkInToMax: 1320,
      checkOutMin: 660,
      isInstantBook: property.status === PropertyStatus.PUBLISHED,
      status: property.status,
      activationFee: property.status === PropertyStatus.PUBLISHED ? 1250 : 1500,
      activationFeeCurrency: 'AED',
      activationPaymentStatus:
        property.status === PropertyStatus.PUBLISHED
          ? PropertyActivationPaymentStatus.PAID
          : PropertyActivationPaymentStatus.UNPAID,
      documentStatus:
        property.status === PropertyStatus.PUBLISHED ? 'accepted' : 'pending',
      lastSubmittedAt:
        property.status === PropertyStatus.PUBLISHED ||
        property.status === PropertyStatus.UNDER_REVIEW
          ? addDays(utcDay(2025, 9, 1), index)
          : null,
      lastReviewedAt:
        property.status === PropertyStatus.PUBLISHED
          ? addDays(utcDay(2025, 9, 3), index)
          : null,
      createdAt: addDays(utcDay(2025, 8, 15), index),
    })),
  });

  await tx.propertyAvailabilitySettings.createMany({
    data: plan.properties.map((property) => ({
      propertyId: property.id,
      defaultMinNights: property.minNights,
      defaultMaxNights: 45,
      advanceNoticeDays: property.status === PropertyStatus.PUBLISHED ? 0 : 2,
      preparationDays: property.basePrice > 1500 ? 1 : 0,
    })),
  });

  await tx.cancellationPolicyConfig.createMany({
    data: plan.properties.map((property) => ({
      id: stableUuid(`showcase-cancellation:${property.id}`),
      propertyId: property.id,
      version: 'showcase-flex-v1',
      isActive: true,
      freeCancelBeforeHours: 96,
      partialRefundBeforeHours: 48,
      noRefundWithinHours: 24,
      penaltyValue: property.basePrice > 1500 ? 30 : 20,
    })),
  });

  await tx.securityDepositPolicy.createMany({
    data: plan.properties.map((property) => ({
      id: stableUuid(`showcase-deposit-policy:${property.id}`),
      propertyId: property.id,
      mode:
        property.basePrice > 1200
          ? SecurityDepositMode.AUTHORIZE
          : SecurityDepositMode.NONE,
      amount:
        property.basePrice > 2500 ? 2500 : property.basePrice > 1200 ? 1200 : 0,
      currency: 'AED',
      holdDaysAfterCheckout: property.basePrice > 1200 ? 3 : 0,
      isActive: true,
    })),
  });

  await tx.propertyServiceConfig.createMany({
    data: plan.properties.map((property) => {
      const planCode = servicePlanByVendor.get(property.vendorId) ?? 'FP_SEMI';
      const servicePlanId = stableUuid(
        `showcase-service-plan:${servicePlanSlug(planCode)}`,
      );
      return {
        id: stableUuid(`showcase-property-service:${property.id}`),
        propertyId: property.id,
        servicePlanId,
        vendorAgreementId: stableUuid(
          `showcase-vendor-agreement:${stableUuid(`showcase-vendor-profile:${property.vendorId}`)}`,
        ),
        cleaningRequired: planCode !== 'FP_LIST',
        linenChangeRequired: planCode !== 'FP_LIST',
        inspectionRequired: planCode !== 'FP_LIST',
        restockRequired: planCode === 'FP_FULL',
        maintenanceIncluded: planCode !== 'FP_LIST',
        guestCleaningFee: property.cleaningFee,
        currency: 'AED',
      };
    }),
  });

  await tx.propertyAmenity.createMany({
    data: plan.properties.flatMap((property) =>
      property.amenityKeys.map((key) => ({
        propertyId: property.id,
        amenityId: stableUuid(`showcase-amenity:${key}`),
      })),
    ),
    skipDuplicates: true,
  });

  await tx.media.createMany({
    data: plan.properties.flatMap((property) =>
      property.imagePlans.map((image) => ({
        id: image.id,
        propertyId: property.id,
        url: image.secureUrl ?? '',
        alt: image.alt,
        sortOrder: image.sortOrder,
        category: image.category,
      })),
    ),
  });

  await tx.propertyReview.createMany({
    data: plan.properties
      .filter((property) => property.status === PropertyStatus.PUBLISHED)
      .map((property, index) => ({
        id: stableUuid(`showcase-property-review:${property.id}`),
        propertyId: property.id,
        adminId: plan.admins[index % plan.admins.length].id,
        decision: PropertyReviewDecision.APPROVE,
        notes:
          'Approved after media, location, pricing, and ownership checks passed for showcase data.',
        checklistJson: json({
          seed: SHOWCASE_SEED_TAG,
          mediaCount: property.imagePlans.length,
          requiredCategories: ['LIVING_ROOM', 'BEDROOM', 'BATHROOM', 'KITCHEN'],
          nearbyAttractions: property.attractions,
        }),
        createdAt: addDays(utcDay(2025, 9, 5), index),
      })),
  });

  await tx.propertyCalendarDay.createMany({
    data: plan.properties.flatMap((property, index) =>
      [18, 43, 89].map((offset) => ({
        propertyId: property.id,
        date: addDays(utcDay(2026, 5, 9), offset + (index % 5)),
        status: CalendarDayStatus.BLOCKED,
        minNightsOverride: null,
        note:
          index % 2 === 0 ? 'Owner maintenance block' : 'Private owner stay',
      })),
    ),
    skipDuplicates: true,
  });

  await seedPricingAndPromos(tx, plan);
}

async function seedPricingAndPromos(
  tx: Prisma.TransactionClient,
  plan: ShowcaseGeneratedPlan,
): Promise<void> {
  const published = plan.properties.filter(
    (property) => property.status === PropertyStatus.PUBLISHED,
  );

  await tx.pricingRule.createMany({
    data: published.flatMap((property) => [
      {
        id: stableUuid(`showcase-pricing:${property.id}:weekend`),
        propertyId: property.id,
        type: PricingRuleType.WEEKEND,
        name: 'Dubai Weekend Premium',
        startDate: utcDay(2025, 9, 1),
        endDate: utcDay(2026, 12, 31),
        priceMultiplier: 1.18,
        priority: 10,
        isActive: true,
      },
      {
        id: stableUuid(`showcase-pricing:${property.id}:winter`),
        propertyId: property.id,
        type: PricingRuleType.SEASONAL,
        name: 'Winter Peak Season',
        startDate: utcDay(2025, 12, 1),
        endDate: utcDay(2026, 2, 28),
        priceMultiplier: property.basePrice > 1500 ? 1.35 : 1.22,
        priority: 25,
        isActive: true,
      },
      {
        id: stableUuid(`showcase-pricing:${property.id}:summer`),
        propertyId: property.id,
        type: PricingRuleType.SEASONAL,
        name: 'UAE Summer Long-Stay Offer',
        startDate: utcDay(2026, 7, 1),
        endDate: utcDay(2026, 8, 31),
        priceMultiplier: 0.86,
        priority: 15,
        isActive: true,
      },
    ]),
  });

  await tx.promoCode.createMany({
    data: [
      {
        id: stableUuid('showcase-promo:DUBAIWEEKEND'),
        code: 'DUBAIWEEKEND',
        discountPercent: 10,
        validFrom: utcDay(2026, 5, 1),
        validTo: utcDay(2026, 8, 31),
        usageLimit: 200,
        minBookingAmount: 1200,
        maxDiscount: 600,
        isActive: true,
      },
      {
        id: stableUuid('showcase-promo:PALMLUXE'),
        code: 'PALMLUXE',
        discountPercent: 8,
        validFrom: utcDay(2026, 5, 1),
        validTo: utcDay(2026, 12, 31),
        usageLimit: 80,
        minBookingAmount: 4500,
        maxDiscount: 1200,
        propertyId:
          published.find((property) => property.area === 'Palm Jumeirah')?.id ??
          null,
        isActive: true,
      },
      {
        id: stableUuid('showcase-promo:BUSINESSBAY250'),
        code: 'BUSINESSBAY250',
        discountAmount: 250,
        currency: 'AED',
        validFrom: utcDay(2026, 5, 1),
        validTo: utcDay(2026, 9, 30),
        usageLimit: 120,
        minBookingAmount: 1800,
        isActive: true,
      },
    ],
  });
}

async function seedBookingsAndOperations(
  prisma: PrismaClient,
  plan: ShowcaseGeneratedPlan,
): Promise<void> {
  const propertyById = new Map(
    plan.properties.map((property) => [property.id, property]),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.propertyHold.createMany({
        data: plan.bookings.map((booking) => ({
          id: booking.holdId,
          propertyId: booking.propertyId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: HoldStatus.ACTIVE,
          expiresAt: addHours(booking.createdAt, 6),
          adults: booking.adults,
          children: booking.children,
          quotedTotalAed: booking.totalAmount,
          quotedTotalDisplay: booking.totalAmount,
          displayCurrency: 'AED',
          fxRate: '1',
          fxAsOfDate: booking.createdAt,
          fxProvider: 'showcase-manual',
          quotedBreakdown: booking.breakdown as Prisma.InputJsonValue,
          createdById: booking.customerId,
          createdAt: booking.createdAt,
        })),
      });

      await tx.booking.createMany({
        data: plan.bookings.map((booking) => ({
          id: booking.id,
          customerId: booking.customerId,
          propertyId: booking.propertyId,
          holdId: booking.holdId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          adults: booking.adults,
          children: booking.children,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          currency: 'AED',
          confirmedAt:
            booking.status === BookingStatus.PENDING_PAYMENT
              ? null
              : addHours(booking.createdAt, 4),
          totalAmountAed: booking.totalAmount,
          displayTotalAmount: booking.totalAmount,
          displayCurrency: 'AED',
          fxRate: '1',
          fxAsOfDate: booking.createdAt,
          fxProvider: 'showcase-manual',
          idempotencyKey: `showcase-${booking.id}`,
          priceBreakdown: booking.breakdown as Prisma.InputJsonValue,
          createdAt: booking.createdAt,
          expiresAt:
            booking.status === BookingStatus.PENDING_PAYMENT
              ? addHours(booking.createdAt, 12)
              : null,
          cancelledAt:
            booking.status === BookingStatus.CANCELLED
              ? addHours(booking.createdAt, 18)
              : null,
          completedAt:
            booking.status === BookingStatus.COMPLETED
              ? addHours(booking.checkOut, 15)
              : null,
          cancelledBy:
            booking.status === BookingStatus.CANCELLED
              ? CancellationActor.CUSTOMER
              : null,
          cancellationReason:
            booking.status === BookingStatus.CANCELLED
              ? CancellationReason.GUEST_REQUEST
              : null,
        })),
      });

      for (const booking of plan.bookings) {
        await tx.propertyHold.update({
          where: { id: booking.holdId },
          data: {
            status: HoldStatus.CONVERTED,
            bookingId: booking.id,
            convertedAt: addHours(booking.createdAt, 2),
          },
        });
      }

      await tx.payment.createMany({
        data: plan.bookings.map((booking) => ({
          id: booking.paymentId,
          bookingId: booking.id,
          provider: PaymentProvider.MANUAL,
          status:
            booking.status === BookingStatus.PENDING_PAYMENT
              ? PaymentStatus.REQUIRES_ACTION
              : booking.status === BookingStatus.CANCELLED
                ? PaymentStatus.REFUNDED
                : PaymentStatus.CAPTURED,
          amount: booking.totalAmount,
          currency: 'AED',
          providerRef: `manual-showcase-${booking.id.slice(0, 8)}`,
          rawPayloadJson: json({
            seed: SHOWCASE_SEED_TAG,
            bookingId: booking.id,
          }),
          createdAt: addHours(booking.createdAt, 3),
        })),
      });

      await tx.paymentEvent.createMany({
        data: plan.bookings.flatMap((booking) => {
          const events: Prisma.PaymentEventCreateManyInput[] = [
            {
              paymentId: booking.paymentId,
              type: PaymentEventType.AUTHORIZE,
              idempotencyKey: `auth-${booking.id}`,
              providerRef: `auth-${booking.id.slice(0, 10)}`,
              payloadJson: json({ stage: 'authorized', bookingId: booking.id }),
              createdAt: addHours(booking.createdAt, 3),
            },
          ];
          if (booking.status !== BookingStatus.PENDING_PAYMENT) {
            events.push({
              paymentId: booking.paymentId,
              type: PaymentEventType.CAPTURE,
              idempotencyKey: `capture-${booking.id}`,
              providerRef: `capture-${booking.id.slice(0, 10)}`,
              payloadJson: json({ stage: 'captured', bookingId: booking.id }),
              createdAt: addHours(booking.createdAt, 4),
            });
          }
          if (booking.status === BookingStatus.CANCELLED) {
            events.push({
              paymentId: booking.paymentId,
              type: PaymentEventType.REFUND,
              idempotencyKey: `refund-${booking.id}`,
              providerRef: `refund-${booking.id.slice(0, 10)}`,
              payloadJson: json({ stage: 'refunded', bookingId: booking.id }),
              createdAt: addHours(booking.createdAt, 20),
            });
          }
          return events;
        }),
      });

      await tx.bookingBlockedDate.createMany({
        data: plan.bookings
          .filter((booking) => booking.status !== BookingStatus.CANCELLED)
          .flatMap((booking) =>
            eachNight(booking.checkIn, booking.checkOut).map((date) => ({
              propertyId: booking.propertyId,
              bookingId: booking.id,
              date,
            })),
          ),
        skipDuplicates: true,
      });

      await tx.propertyCalendarDay.createMany({
        data: plan.bookings
          .filter((booking) => booking.status !== BookingStatus.CANCELLED)
          .flatMap((booking) =>
            eachNight(booking.checkIn, booking.checkOut).map((date) => ({
              propertyId: booking.propertyId,
              date,
              status: CalendarDayStatus.BLOCKED,
              note:
                booking.status === BookingStatus.COMPLETED
                  ? 'Completed booking'
                  : 'Confirmed guest booking',
            })),
          ),
        skipDuplicates: true,
      });

      await seedCancelledBookings(tx, plan.bookings);
      await seedDepositsLedgersAndOps(tx, plan.bookings, propertyById);
    },
    { maxWait: 120_000, timeout: 120_000 },
  );
}

async function seedCancelledBookings(
  tx: Prisma.TransactionClient,
  bookings: BookingPlan[],
): Promise<void> {
  const cancelled = bookings.filter(
    (booking) => booking.status === BookingStatus.CANCELLED,
  );

  await tx.refund.createMany({
    data: cancelled.map((booking) => ({
      id: stableUuid(`showcase-refund:${booking.id}`),
      bookingId: booking.id,
      paymentId: booking.paymentId,
      status: RefundStatus.SUCCEEDED,
      reason: RefundReason.CANCELLATION,
      amount: Math.round(booking.totalAmount * 0.75),
      currency: 'AED',
      provider: PaymentProvider.MANUAL,
      providerRefundRef: `manual-refund-${booking.id.slice(0, 8)}`,
      idempotencyKey: `showcase-refund-${booking.id}`,
      createdAt: addHours(booking.createdAt, 21),
    })),
  });

  await tx.bookingCancellation.createMany({
    data: cancelled.map((booking) => {
      const refundableAmount = Math.round(booking.totalAmount * 0.75);
      const penaltyAmount = booking.totalAmount - refundableAmount;
      return {
        id: stableUuid(`showcase-cancellation:${booking.id}`),
        bookingId: booking.id,
        actor: CancellationActor.CUSTOMER,
        reason: CancellationReason.GUEST_REQUEST,
        notes:
          'Guest requested cancellation after travel plans changed. Refund processed under flexible policy.',
        mode: CancellationMode.SOFT,
        policyVersion: 'showcase-flex-v1',
        cancelledAt: addHours(booking.createdAt, 18),
        totalAmount: booking.totalAmount,
        managementFee: 0,
        penaltyAmount,
        refundableAmount,
        currency: 'AED',
        displayCurrency: 'AED',
        displayFxRate: '1',
        totalAmountDisplay: booking.totalAmount,
        penaltyAmountDisplay: penaltyAmount,
        refundableAmountDisplay: refundableAmount,
        releasesInventory: true,
        refundId: stableUuid(`showcase-refund:${booking.id}`),
        createdAt: addHours(booking.createdAt, 19),
      };
    }),
  });
}

async function seedDepositsLedgersAndOps(
  tx: Prisma.TransactionClient,
  bookings: BookingPlan[],
  propertyById: Map<string, PropertyPlan>,
): Promise<void> {
  const paidBookings = bookings.filter(
    (booking) => booking.status !== BookingStatus.PENDING_PAYMENT,
  );

  await tx.securityDeposit.createMany({
    data: paidBookings
      .filter((booking, index) => index % 3 === 0)
      .map((booking) => {
        const property = propertyById.get(booking.propertyId);
        const amount = property && property.basePrice > 2000 ? 2500 : 1000;
        return {
          id: stableUuid(`showcase-security-deposit:${booking.id}`),
          bookingId: booking.id,
          propertyId: booking.propertyId,
          customerId: booking.customerId,
          mode: SecurityDepositMode.AUTHORIZE,
          status:
            booking.status === BookingStatus.COMPLETED
              ? SecurityDepositStatus.RELEASED
              : SecurityDepositStatus.AUTHORIZED,
          amount,
          currency: 'AED',
          provider: PaymentProvider.MANUAL,
          providerRef: `deposit-${booking.id.slice(0, 8)}`,
          authorizedAt: addHours(booking.createdAt, 4),
          releasedAt:
            booking.status === BookingStatus.COMPLETED
              ? addHours(booking.checkOut, 30)
              : null,
          note: 'Showcase security deposit authorization.',
          metaJson: json({ seed: SHOWCASE_SEED_TAG }),
        };
      }),
  });

  await tx.ledgerEntry.createMany({
    data: paidBookings.flatMap((booking) => {
      const managementFee = Math.round(booking.totalAmount * 0.17);
      return [
        {
          id: stableUuid(`showcase-ledger:${booking.id}:captured`),
          vendorId: booking.vendorId,
          propertyId: booking.propertyId,
          bookingId: booking.id,
          paymentId: booking.paymentId,
          type: LedgerEntryType.BOOKING_CAPTURED,
          direction: LedgerDirection.CREDIT,
          amount: booking.totalAmount,
          currency: 'AED',
          occurredAt: addHours(booking.createdAt, 4),
          idempotencyKey: `showcase-ledger-capture-${booking.id}`,
          metaJson: json({ seed: SHOWCASE_SEED_TAG }),
        },
        {
          id: stableUuid(`showcase-ledger:${booking.id}:fee`),
          vendorId: booking.vendorId,
          propertyId: booking.propertyId,
          bookingId: booking.id,
          paymentId: booking.paymentId,
          type: LedgerEntryType.MANAGEMENT_FEE,
          direction: LedgerDirection.DEBIT,
          amount: managementFee,
          currency: 'AED',
          occurredAt: addHours(booking.createdAt, 4.2),
          idempotencyKey: `showcase-ledger-fee-${booking.id}`,
          metaJson: json({ managementFeeBps: 1700, seed: SHOWCASE_SEED_TAG }),
        },
      ];
    }),
  });

  await tx.opsTask.createMany({
    data: paidBookings.flatMap((booking) => {
      const isCompleted = booking.status === BookingStatus.COMPLETED;
      return [
        {
          id: stableUuid(`showcase-ops:${booking.id}:cleaning`),
          propertyId: booking.propertyId,
          bookingId: booking.id,
          type: OpsTaskType.CLEANING,
          status: isCompleted ? OpsTaskStatus.DONE : OpsTaskStatus.PENDING,
          scheduledFor: addHours(booking.checkOut, 1),
          dueAt: addHours(booking.checkOut, 6),
          checklistJson: json([
            'linen removed',
            'surfaces sanitized',
            'amenities restocked',
          ]),
          notes: 'Turnover cleaning seeded for showcase operations.',
          completedAt: isCompleted ? addHours(booking.checkOut, 5) : null,
        },
        {
          id: stableUuid(`showcase-ops:${booking.id}:inspection`),
          propertyId: booking.propertyId,
          bookingId: booking.id,
          type: OpsTaskType.INSPECTION,
          status: isCompleted ? OpsTaskStatus.DONE : OpsTaskStatus.PENDING,
          scheduledFor: addHours(booking.checkOut, 6),
          dueAt: addHours(booking.checkOut, 9),
          checklistJson: json([
            'photo check',
            'maintenance scan',
            'lost item review',
          ]),
          notes: 'Post-stay inspection seeded for showcase operations.',
          completedAt: isCompleted ? addHours(booking.checkOut, 8) : null,
        },
      ];
    }),
  });
}

async function seedMarketplaceExtras(
  prisma: PrismaClient,
  plan: ShowcaseGeneratedPlan,
): Promise<{
  reviewCount: number;
  wishlistCount: number;
  messageCount: number;
  notificationCount: number;
}> {
  const random = new SeededRandom(`${SHOWCASE_SEED_TAG}:extras`);
  const reviews = buildReviews(plan, random);
  const wishlists = buildWishlists(plan, random);
  const notificationEvents = buildNotifications(plan);

  await prisma.$transaction(
    async (tx) => {
      await tx.guestReview.createMany({ data: reviews });
      await tx.wishlistItem.createMany({
        data: wishlists,
        skipDuplicates: true,
      });
      await tx.notificationEvent.createMany({
        data: notificationEvents,
        skipDuplicates: true,
      });
      await seedMessages(tx, plan, random);
      await seedMaintenanceAndCommercials(tx, plan, random);
    },
    { maxWait: 120_000, timeout: 120_000 },
  );

  const messageCount = await prisma.message.count();

  return {
    reviewCount: reviews.length,
    wishlistCount: wishlists.length,
    messageCount,
    notificationCount: notificationEvents.length,
  };
}

function buildReviews(
  plan: ShowcaseGeneratedPlan,
  random: SeededRandom,
): Prisma.GuestReviewCreateManyInput[] {
  return plan.bookings.slice(0, 200).map((booking, index) => {
    const property = plan.properties.find(
      (candidate) => candidate.id === booking.propertyId,
    );
    assertSeed(
      property,
      `Review property not found for booking ${booking.id}.`,
    );
    const rating = ratingForIndex(index, random);
    const snippet = REVIEW_SNIPPETS[index % REVIEW_SNIPPETS.length];
    const createdAt =
      booking.status === BookingStatus.COMPLETED
        ? addDays(booking.checkOut, random.int(1, 6))
        : addDays(booking.createdAt, random.int(2, 9));

    return {
      id: stableUuid(`showcase-guest-review:${booking.id}`),
      propertyId: booking.propertyId,
      bookingId: booking.id,
      customerId: booking.customerId,
      rating,
      cleanlinessRating: clamp(rating + random.int(-1, 1), 1, 5),
      locationRating: clamp(rating + random.int(0, 1), 1, 5),
      communicationRating: clamp(rating + random.int(-1, 1), 1, 5),
      valueRating: clamp(rating + random.int(-1, 0), 1, 5),
      title: reviewTitle(rating, property.area),
      comment: `${snippet} Nearby access to ${property.attractions.slice(0, 2).join(' and ')} made the stay feel very easy.`,
      status:
        rating >= 3 && booking.status !== BookingStatus.PENDING_PAYMENT
          ? GuestReviewStatus.APPROVED
          : GuestReviewStatus.PENDING,
      moderatedByAdminId:
        rating >= 3 && booking.status !== BookingStatus.PENDING_PAYMENT
          ? plan.admins[index % plan.admins.length].id
          : null,
      moderatedAt:
        rating >= 3 && booking.status !== BookingStatus.PENDING_PAYMENT
          ? addDays(createdAt, 1)
          : null,
      moderationNotes:
        rating >= 3
          ? 'Approved during showcase moderation pass.'
          : 'Pending manual moderation.',
      hostResponseText:
        index % 3 === 0 ? HOST_RESPONSES[index % HOST_RESPONSES.length] : null,
      hostResponseAt: index % 3 === 0 ? addDays(createdAt, 2) : null,
      createdAt,
    };
  });
}

function buildWishlists(
  plan: ShowcaseGeneratedPlan,
  random: SeededRandom,
): Prisma.WishlistItemCreateManyInput[] {
  const published = plan.properties.filter(
    (property) => property.status === PropertyStatus.PUBLISHED,
  );
  return plan.customers.flatMap((customer, customerIndex) =>
    random.sample(published, 4 + (customerIndex % 3)).map((property) => ({
      id: stableUuid(`showcase-wishlist:${customer.id}:${property.id}`),
      userId: customer.id,
      propertyId: property.id,
      createdAt: addDays(utcDay(2026, 1, 1), customerIndex),
    })),
  );
}

function buildNotifications(
  plan: ShowcaseGeneratedPlan,
): Prisma.NotificationEventCreateManyInput[] {
  const rows: Prisma.NotificationEventCreateManyInput[] = [];

  for (const booking of plan.bookings.slice(0, 150)) {
    rows.push({
      id: stableUuid(`showcase-notification:${booking.id}:customer`),
      type:
        booking.status === BookingStatus.CANCELLED
          ? NotificationType.BOOKING_CANCELLED
          : booking.status === BookingStatus.PENDING_PAYMENT
            ? NotificationType.PAYMENT_PENDING
            : NotificationType.BOOKING_CONFIRMED,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.SENT,
      entityType: 'BOOKING',
      entityId: booking.id,
      recipientUserId: booking.customerId,
      payloadJson: json({
        bookingId: booking.id,
        totalAmount: booking.totalAmount,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
      }),
      attempts: 1,
      nextAttemptAt: addHours(booking.createdAt, 5),
      createdAt: addHours(booking.createdAt, 5),
      sentAt: addHours(booking.createdAt, 5),
      readAt:
        booking.status === BookingStatus.PENDING_PAYMENT
          ? null
          : addHours(booking.createdAt, 8),
    });

    rows.push({
      id: stableUuid(`showcase-notification:${booking.id}:vendor`),
      type: NotificationType.NEW_BOOKING_RECEIVED,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.SENT,
      entityType: 'BOOKING',
      entityId: booking.id,
      recipientUserId: booking.vendorId,
      payloadJson: json({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        totalAmount: booking.totalAmount,
      }),
      attempts: 1,
      nextAttemptAt: addHours(booking.createdAt, 6),
      createdAt: addHours(booking.createdAt, 6),
      sentAt: addHours(booking.createdAt, 6),
      readAt: addHours(booking.createdAt, 10),
    });
  }

  for (const property of plan.properties
    .filter((item) => item.status === PropertyStatus.PUBLISHED)
    .slice(0, 20)) {
    rows.push({
      id: stableUuid(`showcase-notification:${property.id}:activation`),
      type: NotificationType.PROPERTY_APPROVED_ACTIVATION_REQUIRED,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.SENT,
      entityType: 'PROPERTY',
      entityId: property.id,
      recipientUserId: property.vendorId,
      payloadJson: json({ propertyId: property.id, title: property.title }),
      attempts: 1,
      nextAttemptAt: addDays(utcDay(2025, 9, 5), 1),
      createdAt: addDays(utcDay(2025, 9, 5), 1),
      sentAt: addDays(utcDay(2025, 9, 5), 1),
      readAt: addDays(utcDay(2025, 9, 5), 2),
    });
  }

  return rows;
}

async function seedMessages(
  tx: Prisma.TransactionClient,
  plan: ShowcaseGeneratedPlan,
  random: SeededRandom,
): Promise<void> {
  const counterparties = [
    ...plan.customers.slice(0, 22),
    ...plan.vendors.slice(0, 8),
  ];
  const anchor = utcDay(2026, 4, 1);

  for (let i = 0; i < counterparties.length; i += 1) {
    const counterparty = counterparties[i];
    const topic = MESSAGE_TOPICS[i % MESSAGE_TOPICS.length];
    const role =
      counterparty.role === UserRole.VENDOR
        ? MessageCounterpartyRole.VENDOR
        : topic.role === MessageCounterpartyRole.VENDOR
          ? MessageCounterpartyRole.CUSTOMER
          : topic.role;
    const threadId = stableUuid(`showcase-message-thread:${counterparty.id}`);
    const firstAt = addHours(anchor, i * 7);
    const admin = plan.admins[i % plan.admins.length];
    const senderBody = topic.customer;
    const adminBody = topic.admin;

    await tx.messageThread.create({
      data: {
        id: threadId,
        adminId: admin.id,
        counterpartyUserId: counterparty.id,
        counterpartyRole: role,
        topic: topic.topic,
        subject: topic.subject,
        lastMessageAt: addHours(firstAt, 3),
        lastMessagePreview: adminBody.slice(0, 120),
        lastMessageSenderId: admin.id,
        adminLastReadAt: addHours(firstAt, 4),
        counterpartyLastReadAt: random.chance(0.75)
          ? addHours(firstAt, 5)
          : null,
        createdAt: firstAt,
      },
    });

    await tx.message.createMany({
      data: [
        {
          id: stableUuid(`showcase-message:${threadId}:1`),
          threadId,
          senderId: counterparty.id,
          body: senderBody,
          createdAt: firstAt,
        },
        {
          id: stableUuid(`showcase-message:${threadId}:2`),
          threadId,
          senderId: admin.id,
          body: adminBody,
          createdAt: addHours(firstAt, 2),
        },
        {
          id: stableUuid(`showcase-message:${threadId}:3`),
          threadId,
          senderId: counterparty.id,
          body: 'Thanks, that works for us. Appreciate the quick response.',
          createdAt: addHours(firstAt, 3),
        },
      ],
    });
  }
}

async function seedMaintenanceAndCommercials(
  tx: Prisma.TransactionClient,
  plan: ShowcaseGeneratedPlan,
  random: SeededRandom,
): Promise<void> {
  const published = plan.properties.filter(
    (property) => property.status === PropertyStatus.PUBLISHED,
  );
  const maintenanceProperties = published.slice(0, 18);

  for (let i = 0; i < maintenanceProperties.length; i += 1) {
    const property = maintenanceProperties[i];
    const creator = plan.customers[i % plan.customers.length];
    const requestId = stableUuid(`showcase-maintenance:${property.id}`);
    await tx.maintenanceRequest.create({
      data: {
        id: requestId,
        propertyId: property.id,
        createdByUserId: creator.id,
        title: random.pick([
          'AC service request',
          'Slow Wi-Fi report',
          'Kitchen appliance check',
          'Balcony door adjustment',
        ]),
        description:
          'Showcase maintenance request created to populate the operator workflow.',
        priority: random.pick([
          MaintenancePriority.LOW,
          MaintenancePriority.MEDIUM,
          MaintenancePriority.HIGH,
        ]),
        status:
          i % 4 === 0 ? MaintenanceStatus.RESOLVED : MaintenanceStatus.OPEN,
        metaJson: json({ seed: SHOWCASE_SEED_TAG }),
        createdAt: addDays(utcDay(2026, 3, 1), i),
        resolvedAt: i % 4 === 0 ? addDays(utcDay(2026, 3, 2), i) : null,
      },
    });

    await tx.workOrder.create({
      data: {
        id: stableUuid(`showcase-work-order:${requestId}`),
        maintenanceRequestId: requestId,
        status:
          i % 4 === 0 ? WorkOrderStatus.COMPLETED : WorkOrderStatus.APPROVED,
        costEstimate: random.int(180, 950),
        actualCost: i % 4 === 0 ? random.int(180, 950) : null,
        currency: 'AED',
        notes: 'Vendor-approved maintenance workflow seeded for demo.',
        startedAt: addDays(utcDay(2026, 3, 2), i),
        completedAt: i % 4 === 0 ? addDays(utcDay(2026, 3, 3), i) : null,
      },
    });
  }

  await tx.blockRequest.createMany({
    data: published.slice(0, 12).map((property, index) => ({
      id: stableUuid(`showcase-block-request:${property.id}`),
      propertyId: property.id,
      vendorId: property.vendorId,
      startDate: addDays(utcDay(2026, 7, 1), index * 4),
      endDate: addDays(utcDay(2026, 7, 3), index * 4),
      reason:
        index % 2 === 0 ? 'Owner family stay' : 'Scheduled maintenance window',
      status:
        index % 3 === 0
          ? BlockRequestStatus.PENDING
          : BlockRequestStatus.APPROVED,
      reviewedByAdminId: index % 3 === 0 ? null : plan.admins[0].id,
      reviewedAt: index % 3 === 0 ? null : addDays(utcDay(2026, 6, 1), index),
      reviewNotes:
        index % 3 === 0 ? null : 'Approved during showcase operations setup.',
    })),
  });

  await tx.propertyActivationInvoice.createMany({
    data: plan.properties.slice(0, 20).map((property, index) => ({
      id: stableUuid(`showcase-activation-invoice:${property.id}`),
      propertyId: property.id,
      vendorId: property.vendorId,
      amount: 1250,
      currency: 'AED',
      status:
        property.status === PropertyStatus.PUBLISHED
          ? ActivationInvoiceStatus.PAID
          : ActivationInvoiceStatus.PENDING,
      provider: PaymentProvider.MANUAL,
      providerRef: `activation-${property.id.slice(0, 8)}`,
      createdAt: addDays(utcDay(2025, 9, 1), index),
      paidAt:
        property.status === PropertyStatus.PUBLISHED
          ? addDays(utcDay(2025, 9, 2), index)
          : null,
    })),
  });

  await seedFinanceStatements(tx, plan);
}

async function seedFinanceStatements(
  tx: Prisma.TransactionClient,
  plan: ShowcaseGeneratedPlan,
): Promise<void> {
  const paidBookings = plan.bookings.filter(
    (booking) => booking.status !== BookingStatus.PENDING_PAYMENT,
  );
  const totalsByVendor = new Map<string, number>();
  for (const booking of paidBookings) {
    totalsByVendor.set(
      booking.vendorId,
      (totalsByVendor.get(booking.vendorId) ?? 0) + booking.totalAmount,
    );
  }

  await tx.vendorStatement.createMany({
    data: Array.from(totalsByVendor.entries()).map(
      ([vendorId, gross], index) => {
        const managementFees = Math.round(gross * 0.17);
        return {
          id: stableUuid(`showcase-vendor-statement:${vendorId}`),
          vendorId,
          periodStart: utcDay(2026, 4, 1),
          periodEnd: utcDay(2026, 4, 30),
          currency: 'AED',
          status:
            index % 4 === 0
              ? VendorStatementStatus.PAID
              : VendorStatementStatus.FINALIZED,
          grossBookings: gross,
          managementFees,
          refunds: 0,
          adjustments: 0,
          netPayable: gross - managementFees,
          finalizedAt: utcDay(2026, 5, 2),
          paidAt: index % 4 === 0 ? utcDay(2026, 5, 4) : null,
          metaJson: json({ seed: SHOWCASE_SEED_TAG }),
        };
      },
    ),
  });

  await tx.payout.createMany({
    data: Array.from(totalsByVendor.entries()).map(
      ([vendorId, gross], index) => {
        const managementFees = Math.round(gross * 0.17);
        return {
          id: stableUuid(`showcase-payout:${vendorId}`),
          vendorId,
          statementId: stableUuid(`showcase-vendor-statement:${vendorId}`),
          status:
            index % 4 === 0 ? PayoutStatus.SUCCEEDED : PayoutStatus.PENDING,
          amount: gross - managementFees,
          currency: 'AED',
          provider: PaymentProvider.MANUAL,
          providerRef: `payout-${vendorId.slice(0, 8)}`,
          scheduledAt: utcDay(2026, 5, 5),
          processedAt: index % 4 === 0 ? utcDay(2026, 5, 5) : null,
        };
      },
    ),
  });
}

function buildSummary(
  plan: ShowcaseGeneratedPlan,
  uploader: ShowcaseCloudinaryUploader,
  reviews: number,
  wishlists: number,
  messages: number,
  notifications: number,
): ShowcaseSeedSummary {
  const media = plan.properties.reduce(
    (sum, property) => sum + property.imagePlans.length,
    0,
  );
  return {
    users: plan.admins.length + plan.vendors.length + plan.customers.length,
    vendors: plan.vendors.length,
    properties: plan.properties.length,
    media,
    bookings: plan.bookings.length,
    reviews,
    wishlists,
    messages,
    notifications,
    uploadedImages: uploader.uploaded,
    reusedImages: uploader.reused,
    sampleAccounts: [
      { role: 'ADMIN', email: plan.admins[0].email, password: PASSWORD },
      { role: 'VENDOR', email: plan.vendors[0].email, password: PASSWORD },
      { role: 'CUSTOMER', email: plan.customers[0].email, password: PASSWORD },
    ],
  };
}

function buildImagePlans(params: {
  propertyId: string;
  slug: string;
  title: string;
  imageCount: number;
  folder: string;
  random: SeededRandom;
}): ImagePlan[] {
  return MEDIA_CATEGORY_PLAN.slice(0, params.imageCount).map(
    (category, index) => {
      const pool = IMAGE_SOURCES[category] ?? IMAGE_SOURCES.OTHER;
      const sourceUrl =
        pool[(index + params.random.int(0, pool.length - 1)) % pool.length];
      return {
        id: stableUuid(
          `showcase-media:${params.propertyId}:${index}:${category}`,
        ),
        sourceUrl,
        publicId: `${params.slug}/${String(index + 1).padStart(2, '0')}-${slugify(category)}`,
        folder: params.folder.replace(/^\/+|\/+$/g, ''),
        alt: `${params.title} ${category.replace(/_/g, ' ').toLowerCase()} ${index + 1}`,
        sortOrder: index,
        category,
      };
    },
  );
}

function buildAmenityKeys(
  propertyType: Prisma.PropertyCreateManyInput['propertyType'],
  priceBand: string,
  random: SeededRandom,
): string[] {
  const base = [
    'WIFI',
    'TOWELS',
    'BED_LINENS',
    'KITCHEN',
    'AIR_CONDITIONING',
    'SMART_TV',
    'SMOKE_ALARM',
    'SECURITY_24_7',
  ];
  const premium = [
    'CONCIERGE',
    'POOL',
    'GYM',
    'PARKING',
    'BALCONY',
    'COFFEE_MAKER',
  ];
  const family = ['BABY_COT', 'HIGH_CHAIR', 'WASHING_MACHINE', 'DISHWASHER'];
  const outdoor =
    propertyType === 'VILLA' || propertyType === 'TOWNHOUSE'
      ? ['BBQ_AREA', 'BEACH_ACCESS', 'POOL', 'PARKING']
      : ['ELEVATOR', 'POOL', 'GYM'];

  return Array.from(
    new Set([
      ...base,
      ...random.sample(premium, priceBand === 'budget' ? 2 : 5),
      ...random.sample(family, 2),
      ...random.sample(outdoor, 2),
    ]),
  );
}

function buildDescription(input: {
  area: string;
  city: string;
  building: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  descriptor: string;
  attractions: string[];
  archetypeLabel: string;
}): string {
  const bedroomText =
    input.bedrooms === 0 ? 'studio' : `${input.bedrooms}-bedroom`;
  return [
    `A ${input.descriptor} ${bedroomText} ${input.archetypeLabel.toLowerCase()} in ${input.building}, set up for short-stay guests who want a polished UAE base without hotel constraints.`,
    `The home sleeps up to ${input.maxGuests}, with ${input.bathrooms} bathroom${input.bathrooms === 1 ? '' : 's'}, hotel-quality linens, a practical kitchen, strong Wi-Fi, and a living area designed for relaxed evenings after meetings or beach days.`,
    `Guests are close to ${input.attractions.slice(0, 3).join(', ')}, with taxis and delivery services readily available across ${input.area}.`,
    'House rules are simple: no smoking indoors, registered guests only, quiet hours after 10pm, and respectful use of shared building amenities.',
  ].join('\n\n');
}

function priceBreakdown(
  property: PropertyPlan,
  nights: number,
  random: SeededRandom,
): Record<string, number | string> {
  const nightlySubtotal = property.basePrice * nights;
  const discount = random.chance(0.18) ? Math.round(nightlySubtotal * 0.08) : 0;
  const serviceFee = Math.round((nightlySubtotal - discount) * 0.12);
  const tourismDirham = property.starRating * nights * 10;
  const vat = Math.round(
    (nightlySubtotal - discount + property.cleaningFee + serviceFee) * 0.05,
  );
  const total = roundAed(
    nightlySubtotal -
      discount +
      property.cleaningFee +
      serviceFee +
      tourismDirham +
      vat,
  );

  return {
    currency: 'AED',
    nights,
    nightlyRate: property.basePrice,
    nightlySubtotal,
    discount,
    cleaningFee: property.cleaningFee,
    serviceFee,
    tourismDirham,
    vat,
    total,
  };
}

function ratingForIndex(index: number, random: SeededRandom): number {
  if (index % 41 === 0) return 2;
  if (index % 13 === 0) return 3;
  if (index % 5 === 0) return 4;
  return random.chance(0.72) ? 5 : 4;
}

function reviewTitle(rating: number, area: string): string {
  if (rating >= 5) return `Excellent ${area} stay`;
  if (rating === 4) return `Very good location in ${area}`;
  if (rating === 3) return `Good area, a few details to improve`;
  return `Disappointing stay despite the location`;
}

function uniquePropertyTitle(
  area: string,
  descriptor: string,
  noun: string,
  building: string,
  index: number,
): string {
  const cleanArea = area.replace('Jumeirah Beach Residence (JBR)', 'JBR');
  const suffix =
    index % 3 === 0
      ? `near ${building}`
      : index % 3 === 1
        ? 'with Skyline Views'
        : 'with Premium Amenities';
  return `${cleanArea} ${descriptor} ${noun} ${suffix}`;
}

function servicePlanSlug(planCode: string): string {
  if (planCode === 'FP_FULL') return 'fully-managed';
  if (planCode === 'FP_SEMI') return 'semi-managed';
  return 'listing-only';
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}
