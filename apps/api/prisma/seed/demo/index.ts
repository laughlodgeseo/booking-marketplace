import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  CalendarDayStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  PrismaClient,
  PropertyDocumentType,
  PropertyReviewDecision,
  PropertyStatus,
  ServicePlan,
  UserRole,
  VendorAgreementStatus,
  VendorStatus,
} from '@prisma/client';
import { API_ROOT_DIR } from '../../../src/common/upload/storage-paths';
import { seedOperatorLayer } from '../operator.seed';
import { seedDemoBookings } from './bookings';
import { buildPropertyMediaRows } from './images';
import { createOwnershipProofPdf } from './pdf';
import { verifyDemoSeed } from './verify';

type UserKey =
  | 'admin'
  | 'vendor.oasis'
  | 'vendor.marina'
  | 'vendor.palm'
  | 'vendor.vista'
  | 'customer.ayaan'
  | 'customer.sara'
  | 'customer.omar'
  | 'customer.huda'
  | 'customer.zain'
  | 'customer.mariam'
  | 'customer.ibrahim';

type OwnerKey = 'vendor.oasis' | 'vendor.marina' | 'vendor.palm' | 'vendor.vista' | 'admin.internal';

type UserSeedSpec = {
  key: UserKey;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
};

type VendorProfileSeedSpec = {
  ownerKey: OwnerKey;
  userKey: UserKey;
  displayName: string;
  companyName: string;
  phone: string;
  planCode: 'FP_LIST' | 'FP_SEMI' | 'FP_FULL';
};

type PropertySeedSpec = {
  slug: string;
  title: string;
  description: string;
  addressLine1: string;
  community: string;
  city: 'Dubai';
  country: 'UAE';
  lat: number;
  lng: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePrice: number;
  cleaningFee: number;
  minNights: 2 | 3;
  ownerKey: OwnerKey;
  status: PropertyStatus;
  buildingName: string;
  unitNumber: string;
  createdAt: Date;
};

type AmenitySeed = {
  key: string;
  name: string;
  groupKey: string;
  sortOrder: number;
};

const DEMO_PASSWORD = 'password123';
const DEMO_PROPERTY_SLUG_PREFIX = 'demo-';

const BOOKING_WINDOW_START = new Date('2026-02-22T00:00:00.000Z');
const BOOKING_WINDOW_END = new Date('2026-03-22T23:59:59.999Z');

const SEED_UPLOAD_DIR = join(API_ROOT_DIR, 'uploads', 'seed');
const SEED_UPLOAD_PROPERTIES_DIR = join(SEED_UPLOAD_DIR, 'properties');
const SEED_UPLOAD_DOCUMENTS_DIR = join(SEED_UPLOAD_DIR, 'documents');
const SEED_ASSETS_DIR = join(API_ROOT_DIR, 'prisma', 'seed', 'assets');

const REJECTION_REASON =
  'Rejected: Ownership proof document is blurred and unit number does not match the property listing. Please re-upload a clearer proof and confirm DTCM permit reference.';

const ADMIN_USER: UserSeedSpec = {
  key: 'admin',
  fullName: 'Admin (Demo)',
  email: 'admin@rentpropertyuae.com',
  phone: '+971 50 000 0001',
  role: UserRole.ADMIN,
};

const VENDOR_USERS: UserSeedSpec[] = [
  {
    key: 'vendor.oasis',
    fullName: 'Oasis Keys Holiday Homes LLC',
    email: 'vendor.oasis@rentpropertyuae.com',
    phone: '+971 50 111 1001',
    role: UserRole.VENDOR,
  },
  {
    key: 'vendor.marina',
    fullName: 'Marina Crest Stays',
    email: 'vendor.marina@rentpropertyuae.com',
    phone: '+971 50 111 1002',
    role: UserRole.VENDOR,
  },
  {
    key: 'vendor.palm',
    fullName: 'Palm Horizon Rentals',
    email: 'vendor.palm@rentpropertyuae.com',
    phone: '+971 50 111 1003',
    role: UserRole.VENDOR,
  },
  {
    key: 'vendor.vista',
    fullName: 'Downtown Vista Homes',
    email: 'vendor.vista@rentpropertyuae.com',
    phone: '+971 50 111 1004',
    role: UserRole.VENDOR,
  },
];

const CUSTOMER_USERS: UserSeedSpec[] = [
  {
    key: 'customer.ayaan',
    fullName: 'Ayaan Khan',
    email: 'customer.ayaan@rentpropertyuae.com',
    phone: '+971 54 200 3001',
    role: UserRole.CUSTOMER,
  },
  {
    key: 'customer.sara',
    fullName: 'Sara Malik',
    email: 'customer.sara@rentpropertyuae.com',
    phone: '+971 54 200 3002',
    role: UserRole.CUSTOMER,
  },
  {
    key: 'customer.omar',
    fullName: 'Omar Siddiqui',
    email: 'customer.omar@rentpropertyuae.com',
    phone: '+971 54 200 3003',
    role: UserRole.CUSTOMER,
  },
  {
    key: 'customer.huda',
    fullName: 'Huda Al Nuaimi',
    email: 'customer.huda@rentpropertyuae.com',
    phone: '+971 54 200 3004',
    role: UserRole.CUSTOMER,
  },
  {
    key: 'customer.zain',
    fullName: 'Zain Ahmed',
    email: 'customer.zain@rentpropertyuae.com',
    phone: '+971 54 200 3005',
    role: UserRole.CUSTOMER,
  },
  {
    key: 'customer.mariam',
    fullName: 'Mariam Faisal',
    email: 'customer.mariam@rentpropertyuae.com',
    phone: '+971 54 200 3006',
    role: UserRole.CUSTOMER,
  },
  {
    key: 'customer.ibrahim',
    fullName: 'Ibrahim Noor',
    email: 'customer.ibrahim@rentpropertyuae.com',
    phone: '+971 54 200 3007',
    role: UserRole.CUSTOMER,
  },
];

const VENDOR_PROFILES: VendorProfileSeedSpec[] = [
  {
    ownerKey: 'vendor.oasis',
    userKey: 'vendor.oasis',
    displayName: 'Oasis Keys Holiday Homes LLC',
    companyName: 'Oasis Keys Holiday Homes LLC',
    phone: '+971 50 111 1001',
    planCode: 'FP_FULL',
  },
  {
    ownerKey: 'vendor.marina',
    userKey: 'vendor.marina',
    displayName: 'Marina Crest Stays',
    companyName: 'Marina Crest Stays',
    phone: '+971 50 111 1002',
    planCode: 'FP_SEMI',
  },
  {
    ownerKey: 'vendor.palm',
    userKey: 'vendor.palm',
    displayName: 'Palm Horizon Rentals',
    companyName: 'Palm Horizon Rentals',
    phone: '+971 50 111 1003',
    planCode: 'FP_FULL',
  },
  {
    ownerKey: 'vendor.vista',
    userKey: 'vendor.vista',
    displayName: 'Downtown Vista Homes',
    companyName: 'Downtown Vista Homes',
    phone: '+971 50 111 1004',
    planCode: 'FP_SEMI',
  },
  {
    ownerKey: 'admin.internal',
    userKey: 'admin',
    displayName: 'Internal Inventory - RentPropertyUAE',
    companyName: 'Internal Inventory - RentPropertyUAE',
    phone: '+971 50 000 0001',
    planCode: 'FP_FULL',
  },
];

const PROPERTY_SPECS: PropertySeedSpec[] = [
  {
    slug: 'demo-burj-vista-suite-downtown-dubai',
    title: 'Burj Vista Signature Suite',
    description:
      'Frank Porter inspired short-stay suite with Downtown skyline exposure, guest-ready interiors, and polished host operations.',
    addressLine1: 'Unit 1406, Burj Vista Tower 1, Downtown Dubai',
    community: 'Downtown Dubai',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.1945,
    lng: 55.2796,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 980,
    cleaningFee: 220,
    minNights: 2,
    ownerKey: 'vendor.oasis',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Burj Vista Tower 1',
    unitNumber: 'Unit 1406',
    createdAt: new Date('2026-01-08T09:00:00.000Z'),
  },
  {
    slug: 'demo-canal-heights-residence-business-bay',
    title: 'Canal Heights Residence',
    description:
      'Business Bay residence set up for premium business and leisure guests with steady cleaning and inspection workflows.',
    addressLine1: 'Unit 1904, Canal Heights, Business Bay',
    community: 'Business Bay',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.1867,
    lng: 55.2719,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 860,
    cleaningFee: 210,
    minNights: 2,
    ownerKey: 'vendor.marina',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Canal Heights',
    unitNumber: 'Unit 1904',
    createdAt: new Date('2026-01-10T09:00:00.000Z'),
  },
  {
    slug: 'demo-marina-horizon-apartment-dubai-marina',
    title: 'Marina Horizon Apartment',
    description:
      'Dubai Marina apartment with clear waterfront visuals and complete operations handoff for smooth turnovers.',
    addressLine1: 'Unit 2407, Marina Gate 2, Dubai Marina',
    community: 'Dubai Marina',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.0803,
    lng: 55.1413,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 3,
    basePrice: 790,
    cleaningFee: 180,
    minNights: 2,
    ownerKey: 'vendor.palm',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Marina Gate 2',
    unitNumber: 'Unit 2407',
    createdAt: new Date('2026-01-12T09:00:00.000Z'),
  },
  {
    slug: 'demo-sea-breeze-flat-jbr',
    title: 'Sea Breeze Flat',
    description:
      'JBR stay crafted for beach-facing short lets with dependable inspection and linen service windows.',
    addressLine1: 'Unit 1108, Bahar 4, JBR',
    community: 'JBR',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.0795,
    lng: 55.1356,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 5,
    basePrice: 910,
    cleaningFee: 210,
    minNights: 3,
    ownerKey: 'vendor.vista',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Bahar 4',
    unitNumber: 'Unit 1108',
    createdAt: new Date('2026-01-14T09:00:00.000Z'),
  },
  {
    slug: 'demo-palm-shore-retreat-palm-jumeirah',
    title: 'Palm Shore Retreat',
    description:
      'Palm Jumeirah retreat balancing resort amenities and reliable guest support operations for extended weekends.',
    addressLine1: 'Unit 908, Shoreline Building 12, Palm Jumeirah',
    community: 'Palm Jumeirah',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.1127,
    lng: 55.1385,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 1140,
    cleaningFee: 260,
    minNights: 3,
    ownerKey: 'vendor.oasis',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Shoreline Building 12',
    unitNumber: 'Unit 908',
    createdAt: new Date('2026-01-16T09:00:00.000Z'),
  },
  {
    slug: 'demo-jlt-lakeview-residence-jlt',
    title: 'JLT Lakeview Residence',
    description:
      'Lake-facing JLT residence with structured pre-arrival checks and consistent cleaning/inspection cadence.',
    addressLine1: 'Unit 1703, Cluster X, JLT',
    community: 'JLT',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.0707,
    lng: 55.1453,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 820,
    cleaningFee: 190,
    minNights: 2,
    ownerKey: 'vendor.marina',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'JLT Cluster X',
    unitNumber: 'Unit 1703',
    createdAt: new Date('2026-01-18T09:00:00.000Z'),
  },
  {
    slug: 'demo-city-walk-urban-home-city-walk',
    title: 'City Walk Urban Home',
    description:
      'City Walk residence with design-forward interiors, concierge-ready logistics, and tight booking operations.',
    addressLine1: 'Unit 1302, Building 9A, City Walk',
    community: 'City Walk',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.2088,
    lng: 55.2612,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 960,
    cleaningFee: 230,
    minNights: 2,
    ownerKey: 'vendor.palm',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'City Walk Building 9A',
    unitNumber: 'Unit 1302',
    createdAt: new Date('2026-01-20T09:00:00.000Z'),
  },
  {
    slug: 'demo-difc-skyline-suite-difc',
    title: 'DIFC Skyline Suite',
    description:
      'Corporate-friendly DIFC suite configured for short business stays and rapid operational turnarounds.',
    addressLine1: 'Unit 2201, Index Tower, DIFC',
    community: 'DIFC',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.2135,
    lng: 55.2797,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    basePrice: 880,
    cleaningFee: 170,
    minNights: 2,
    ownerKey: 'vendor.vista',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Index Tower',
    unitNumber: 'Unit 2201',
    createdAt: new Date('2026-01-22T09:00:00.000Z'),
  },
  {
    slug: 'demo-al-barsha-modern-stay-al-barsha',
    title: 'Al Barsha Modern Stay',
    description:
      'Modern Al Barsha apartment near major retail anchors, structured for family-friendly short stays.',
    addressLine1: 'Unit 905, Al Murad Tower, Al Barsha',
    community: 'Al Barsha',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.112,
    lng: 55.203,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 730,
    cleaningFee: 180,
    minNights: 2,
    ownerKey: 'admin.internal',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Al Murad Tower',
    unitNumber: 'Unit 905',
    createdAt: new Date('2026-01-24T09:00:00.000Z'),
  },
  {
    slug: 'demo-creek-harbour-waterfront-home-creek-harbour',
    title: 'Creek Harbour Waterfront Home',
    description:
      'Waterfront Creek Harbour listing under internal inventory for premium guest routing and stable operations.',
    addressLine1: 'Unit 1502, Harbour Views, Creek Harbour',
    community: 'Creek Harbour',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.2061,
    lng: 55.3493,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 840,
    cleaningFee: 200,
    minNights: 2,
    ownerKey: 'admin.internal',
    status: PropertyStatus.PUBLISHED,
    buildingName: 'Harbour Views',
    unitNumber: 'Unit 1502',
    createdAt: new Date('2026-01-25T09:00:00.000Z'),
  },
  {
    slug: 'demo-bluewaters-family-apartment-bluewaters-island',
    title: 'Bluewaters Family Apartment',
    description:
      'Draft inventory item pending full visual package and supporting checklist completion before submission.',
    addressLine1: 'Unit 603, Bluewaters Residences, Bluewaters Island',
    community: 'Bluewaters Island',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.0808,
    lng: 55.122,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 1020,
    cleaningFee: 240,
    minNights: 3,
    ownerKey: 'vendor.oasis',
    status: PropertyStatus.DRAFT,
    buildingName: 'Bluewaters Residences',
    unitNumber: 'Unit 603',
    createdAt: new Date('2026-02-10T09:00:00.000Z'),
  },
  {
    slug: 'demo-greens-garden-flat-the-greens',
    title: 'The Greens Garden Flat',
    description:
      'Internal draft listing retained as incomplete inventory example with intentionally partial media.',
    addressLine1: 'Unit 402, Al Ghozlan 3, The Greens',
    community: 'The Greens',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.1004,
    lng: 55.1762,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    basePrice: 640,
    cleaningFee: 150,
    minNights: 2,
    ownerKey: 'admin.internal',
    status: PropertyStatus.DRAFT,
    buildingName: 'Al Ghozlan 3',
    unitNumber: 'Unit 402',
    createdAt: new Date('2026-02-11T09:00:00.000Z'),
  },
  {
    slug: 'demo-meydan-track-view-home-meydan',
    title: 'Meydan Track View Home',
    description:
      'Submitted listing waiting for admin moderation after ownership and staging documents were uploaded.',
    addressLine1: 'Unit 1804, The Polo Residences, Meydan',
    community: 'Meydan',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.1572,
    lng: 55.2955,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 780,
    cleaningFee: 190,
    minNights: 2,
    ownerKey: 'vendor.marina',
    status: PropertyStatus.UNDER_REVIEW,
    buildingName: 'The Polo Residences',
    unitNumber: 'Unit 1804',
    createdAt: new Date('2026-02-18T10:00:00.000Z'),
  },
  {
    slug: 'demo-dubai-hills-park-view-suite-dubai-hills',
    title: 'Dubai Hills Park View Suite',
    description:
      'Under-review suite with complete ownership paperwork awaiting final admin moderation decision.',
    addressLine1: 'Unit 1201, Park Heights 2, Dubai Hills',
    community: 'Dubai Hills',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.0924,
    lng: 55.2376,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    basePrice: 890,
    cleaningFee: 210,
    minNights: 3,
    ownerKey: 'vendor.palm',
    status: PropertyStatus.UNDER_REVIEW,
    buildingName: 'Park Heights 2',
    unitNumber: 'Unit 1201',
    createdAt: new Date('2026-02-19T10:00:00.000Z'),
  },
  {
    slug: 'demo-deira-heritage-residence-deira',
    title: 'Deira Heritage Residence',
    description:
      'Rejected listing retained to demonstrate vendor-side rejection visibility and remediation workflow.',
    addressLine1: 'Unit 707, Al Muraqqabat Tower, Deira',
    community: 'Deira',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.2697,
    lng: 55.3095,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    basePrice: 560,
    cleaningFee: 140,
    minNights: 2,
    ownerKey: 'vendor.vista',
    status: PropertyStatus.REJECTED,
    buildingName: 'Al Muraqqabat Tower',
    unitNumber: 'Unit 707',
    createdAt: new Date('2026-02-17T10:00:00.000Z'),
  },
];

const AMENITY_GROUPS = [
  { key: 'ESSENTIALS', name: 'Essentials', sortOrder: 10 },
  { key: 'BUILDING', name: 'Building', sortOrder: 20 },
  { key: 'OUTDOOR', name: 'Outdoor', sortOrder: 30 },
];

const AMENITIES: AmenitySeed[] = [
  { key: 'WIFI', name: 'Wi-Fi', groupKey: 'ESSENTIALS', sortOrder: 10 },
  {
    key: 'AIR_CONDITIONING',
    name: 'Air conditioning',
    groupKey: 'ESSENTIALS',
    sortOrder: 20,
  },
  { key: 'TV', name: 'TV', groupKey: 'ESSENTIALS', sortOrder: 30 },
  { key: 'KITCHEN', name: 'Kitchen', groupKey: 'ESSENTIALS', sortOrder: 40 },
  { key: 'POOL', name: 'Pool', groupKey: 'BUILDING', sortOrder: 10 },
  { key: 'GYM', name: 'Gym', groupKey: 'BUILDING', sortOrder: 20 },
  { key: 'PARKING', name: 'Parking', groupKey: 'BUILDING', sortOrder: 30 },
  { key: 'ELEVATOR', name: 'Elevator', groupKey: 'BUILDING', sortOrder: 40 },
  { key: 'BALCONY', name: 'Balcony', groupKey: 'OUTDOOR', sortOrder: 10 },
  {
    key: 'SMOKE_ALARM',
    name: 'Smoke alarm',
    groupKey: 'ESSENTIALS',
    sortOrder: 50,
  },
];

function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[demo-seed] ${message}`);
  }
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function ownerPlanCode(ownerKey: OwnerKey): 'FP_LIST' | 'FP_SEMI' | 'FP_FULL' {
  if (ownerKey === 'vendor.marina') return 'FP_SEMI';
  if (ownerKey === 'vendor.vista') return 'FP_SEMI';
  return 'FP_FULL';
}

function ownerUserKey(ownerKey: OwnerKey): UserKey {
  if (ownerKey === 'admin.internal') return 'admin';
  return ownerKey;
}

function issuedDateForProperty(index: number): Date {
  // Fixed reference date keeps issuance within 60 days for demo consistency.
  const anchor = new Date('2026-02-22T00:00:00.000Z');
  const offsetDays = 5 + ((index * 4) % 55);
  return addDays(anchor, -offsetDays);
}

function maskedEmiratesId(index: number): string {
  const suffix = String((index % 9) + 1);
  return `784-XXXX-XXXXXXX-${suffix}`;
}

function pickAmenityKeys(index: number): string[] {
  const pools: string[][] = [
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'POOL', 'GYM', 'PARKING', 'ELEVATOR', 'BALCONY', 'SMOKE_ALARM'],
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'POOL', 'PARKING', 'BALCONY', 'SMOKE_ALARM'],
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'GYM', 'ELEVATOR', 'BALCONY', 'SMOKE_ALARM'],
  ];
  return pools[index % pools.length];
}

function mediaTargetCount(status: PropertyStatus, index: number): number {
  if (status === PropertyStatus.PUBLISHED) {
    return 10 + (index % 5);
  }
  if (status === PropertyStatus.DRAFT) {
    return 3;
  }
  return 8;
}

function blockedDaysForProperty(index: number): Date[] {
  const first = new Date(Date.UTC(2026, 2, 18 + (index % 3), 0, 0, 0));
  return [first, addDays(first, 1)];
}

function printDemoLoginBanner() {
  const lines = [
    'Demo logins:',
    'Admin',
    `- ${ADMIN_USER.email} / ${DEMO_PASSWORD}`,
    'Vendors',
    ...VENDOR_USERS.map((vendor) => `- ${vendor.email} / ${DEMO_PASSWORD}`),
    'Customers',
    ...CUSTOMER_USERS.map((customer) => `- ${customer.email} / ${DEMO_PASSWORD}`),
  ];

  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

function ensureSeedDirectories() {
  mkdirSync(SEED_UPLOAD_PROPERTIES_DIR, { recursive: true });
  mkdirSync(SEED_UPLOAD_DOCUMENTS_DIR, { recursive: true });
  mkdirSync(SEED_ASSETS_DIR, { recursive: true });
}

async function cleanupPreviousDemoData(prisma: PrismaClient) {
  const explicitDemoEmails = new Set<string>([
    ...VENDOR_USERS.map((user) => user.email),
    ...CUSTOMER_USERS.map((user) => user.email),
    'admin@demo.com',
  ]);

  const legacyDemoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: Array.from(explicitDemoEmails) } },
        { email: { endsWith: '@demo.com' } },
      ],
    },
    select: { id: true, email: true },
  });

  const demoUserIds = legacyDemoUsers.map((user) => user.id);

  const demoProperties = await prisma.property.findMany({
    where: {
      OR: [
        { slug: { startsWith: DEMO_PROPERTY_SLUG_PREFIX } },
        { title: { contains: '[DEMO]' } },
        demoUserIds.length > 0 ? { vendorId: { in: demoUserIds } } : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: {
      id: true,
      locationId: true,
    },
  });

  const demoPropertyIds = demoProperties.map((property) => property.id);
  const demoLocationIds = demoProperties
    .map((property) => property.locationId)
    .filter((id): id is string => typeof id === 'string');

  const demoBookings = await prisma.booking.findMany({
    where: {
      OR: [
        demoPropertyIds.length > 0
          ? { propertyId: { in: demoPropertyIds } }
          : undefined,
        demoUserIds.length > 0 ? { customerId: { in: demoUserIds } } : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: { id: true },
  });

  const demoBookingIds = demoBookings.map((booking) => booking.id);

  const demoPayments = await prisma.payment.findMany({
    where: {
      OR: [
        demoBookingIds.length > 0
          ? { bookingId: { in: demoBookingIds } }
          : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: { id: true },
  });

  const demoPaymentIds = demoPayments.map((payment) => payment.id);

  const demoRefunds = await prisma.refund.findMany({
    where: {
      OR: [
        demoBookingIds.length > 0
          ? { bookingId: { in: demoBookingIds } }
          : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: { id: true },
  });

  const demoRefundIds = demoRefunds.map((refund) => refund.id);

  if (demoPropertyIds.length > 0 || demoBookingIds.length > 0) {
    await prisma.workOrder.deleteMany({
      where: {
        OR: [
          demoPropertyIds.length > 0
            ? { maintenanceRequest: { propertyId: { in: demoPropertyIds } } }
            : undefined,
          demoBookingIds.length > 0
            ? { maintenanceRequest: { bookingId: { in: demoBookingIds } } }
            : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    });

    await prisma.maintenanceRequest.deleteMany({
      where: {
        OR: [
          demoPropertyIds.length > 0
            ? { propertyId: { in: demoPropertyIds } }
            : undefined,
          demoBookingIds.length > 0
            ? { bookingId: { in: demoBookingIds } }
            : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    });

    await prisma.opsTask.deleteMany({
      where: {
        OR: [
          demoPropertyIds.length > 0
            ? { propertyId: { in: demoPropertyIds } }
            : undefined,
          demoBookingIds.length > 0
            ? { bookingId: { in: demoBookingIds } }
            : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    });
  }

  if (demoUserIds.length > 0) {
    await prisma.message.deleteMany({
      where: { senderId: { in: demoUserIds } },
    });
    await prisma.messageThread.deleteMany({
      where: {
        OR: [
          { adminId: { in: demoUserIds } },
          { counterpartyUserId: { in: demoUserIds } },
        ],
      },
    });
  }

  if (demoBookingIds.length > 0 || demoPropertyIds.length > 0 || demoUserIds.length > 0) {
    await prisma.notificationEvent.deleteMany({
      where: {
        OR: [
          demoUserIds.length > 0
            ? { recipientUserId: { in: demoUserIds } }
            : undefined,
          demoBookingIds.length > 0
            ? { entityId: { in: demoBookingIds } }
            : undefined,
          demoPropertyIds.length > 0
            ? { entityId: { in: demoPropertyIds } }
            : undefined,
          demoRefundIds.length > 0 ? { entityId: { in: demoRefundIds } } : undefined,
          demoPaymentIds.length > 0
            ? { entityId: { in: demoPaymentIds } }
            : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    });
  }

  if (demoPaymentIds.length > 0) {
    await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: demoPaymentIds } } });
  }

  if (demoUserIds.length > 0 || demoBookingIds.length > 0 || demoPropertyIds.length > 0) {
    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          demoUserIds.length > 0 ? { vendorId: { in: demoUserIds } } : undefined,
          demoBookingIds.length > 0
            ? { bookingId: { in: demoBookingIds } }
            : undefined,
          demoPropertyIds.length > 0
            ? { propertyId: { in: demoPropertyIds } }
            : undefined,
          demoPaymentIds.length > 0
            ? { paymentId: { in: demoPaymentIds } }
            : undefined,
          demoRefundIds.length > 0 ? { refundId: { in: demoRefundIds } } : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    });
  }

  if (demoUserIds.length > 0) {
    await prisma.payout.deleteMany({ where: { vendorId: { in: demoUserIds } } });
    await prisma.vendorStatement.deleteMany({
      where: { vendorId: { in: demoUserIds } },
    });
  }

  if (demoBookingIds.length > 0) {
    await prisma.securityDeposit.deleteMany({
      where: { bookingId: { in: demoBookingIds } },
    });
    await prisma.refund.deleteMany({ where: { bookingId: { in: demoBookingIds } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: demoBookingIds } } });
    await prisma.bookingCancellation.deleteMany({
      where: { bookingId: { in: demoBookingIds } },
    });
    await prisma.bookingIdempotency.deleteMany({
      where: { bookingId: { in: demoBookingIds } },
    });
    await prisma.bookingDocument.deleteMany({
      where: { bookingId: { in: demoBookingIds } },
    });
    await prisma.guestReview.deleteMany({
      where: { bookingId: { in: demoBookingIds } },
    });
    await prisma.booking.deleteMany({ where: { id: { in: demoBookingIds } } });
  }

  if (demoPropertyIds.length > 0) {
    await prisma.blockRequest.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyHold.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyCalendarDay.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyAvailabilitySettings.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.cancellationPolicyConfig.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.securityDepositPolicy.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyAmenity.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyServiceConfig.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyTranslation.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyDeletionRequest.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyUnpublishRequest.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyReview.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyDocument.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.media.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.propertyActivationInvoice.deleteMany({
      where: { propertyId: { in: demoPropertyIds } },
    });
    await prisma.property.deleteMany({ where: { id: { in: demoPropertyIds } } });
  }

  if (demoLocationIds.length > 0) {
    await prisma.location.deleteMany({ where: { id: { in: demoLocationIds } } });
  }

  if (demoUserIds.length > 0) {
    await prisma.vendorServiceAgreement.deleteMany({
      where: {
        vendorProfile: {
          userId: { in: demoUserIds },
        },
      },
    });

    await prisma.vendorProfile.deleteMany({
      where: { userId: { in: demoUserIds } },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    await prisma.customerDocument.deleteMany({
      where: { userId: { in: demoUserIds } },
    });

    await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });
  }

  rmSync(SEED_UPLOAD_DIR, { recursive: true, force: true });
  rmSync(SEED_ASSETS_DIR, { recursive: true, force: true });
}

async function upsertUser(
  prisma: PrismaClient,
  spec: UserSeedSpec,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email: spec.email },
    update: {
      fullName: spec.fullName,
      passwordHash,
      role: spec.role,
      isEmailVerified: true,
    },
    create: {
      email: spec.email,
      fullName: spec.fullName,
      passwordHash,
      role: spec.role,
      isEmailVerified: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
}

async function seedAmenityCatalog(prisma: PrismaClient) {
  const groupByKey = new Map<string, string>();

  for (const group of AMENITY_GROUPS) {
    const saved = await prisma.amenityGroup.upsert({
      where: { key: group.key },
      update: {
        name: group.name,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      create: {
        key: group.key,
        name: group.name,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      select: { id: true, key: true },
    });
    groupByKey.set(saved.key, saved.id);
  }

  const amenityByKey = new Map<string, string>();
  for (const amenity of AMENITIES) {
    const groupId = groupByKey.get(amenity.groupKey);
    assert(groupId, `Amenity group missing for ${amenity.key}.`);

    const saved = await prisma.amenity.upsert({
      where: { key: amenity.key },
      update: {
        name: amenity.name,
        groupId,
        sortOrder: amenity.sortOrder,
        isActive: true,
      },
      create: {
        key: amenity.key,
        name: amenity.name,
        groupId,
        sortOrder: amenity.sortOrder,
        isActive: true,
      },
      select: { id: true, key: true },
    });
    amenityByKey.set(saved.key, saved.id);
  }

  return amenityByKey;
}

export async function runDemoSeed() {
  if (process.env.SEED_MODE !== 'demo') {
    throw new Error(
      'Demo seeder blocked: set SEED_MODE=demo to run this seed mode.',
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seeder blocked in production environment.');
  }

  const prisma = new PrismaClient();

  // eslint-disable-next-line no-console
  console.log('==============================================');
  // eslint-disable-next-line no-console
  console.log(' DEMO SEED MODE ENABLED (NON-PRODUCTION ONLY) ');
  // eslint-disable-next-line no-console
  console.log(' Existing demo seed data will be removed first ');
  // eslint-disable-next-line no-console
  console.log('==============================================');

  try {
    await cleanupPreviousDemoData(prisma);
    ensureSeedDirectories();

    await seedOperatorLayer(prisma);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const usersByKey = new Map<UserKey, { id: string; email: string }>();

    const admin = await upsertUser(prisma, ADMIN_USER, passwordHash);
    usersByKey.set('admin', { id: admin.id, email: admin.email });

    for (const vendor of VENDOR_USERS) {
      const saved = await upsertUser(prisma, vendor, passwordHash);
      usersByKey.set(vendor.key, { id: saved.id, email: saved.email });
    }

    for (const customer of CUSTOMER_USERS) {
      const saved = await upsertUser(prisma, customer, passwordHash);
      usersByKey.set(customer.key, { id: saved.id, email: saved.email });
    }

    const servicePlans = await prisma.servicePlan.findMany({
      where: {
        code: {
          in: ['FP_LIST', 'FP_SEMI', 'FP_FULL'],
        },
      },
    });

    const servicePlanByCode = new Map<string, ServicePlan>();
    for (const plan of servicePlans) {
      servicePlanByCode.set(plan.code, plan);
    }

    const vendorProfileByOwnerKey = new Map<OwnerKey, { id: string; userId: string; planCode: string }>();

    for (const profileSpec of VENDOR_PROFILES) {
      const user = usersByKey.get(profileSpec.userKey);
      assert(user, `User missing for vendor profile ${profileSpec.ownerKey}.`);

      const profile = await prisma.vendorProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: profileSpec.displayName,
          companyName: profileSpec.companyName,
          phone: profileSpec.phone,
          status: VendorStatus.APPROVED,
        },
        create: {
          userId: user.id,
          displayName: profileSpec.displayName,
          companyName: profileSpec.companyName,
          phone: profileSpec.phone,
          status: VendorStatus.APPROVED,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      vendorProfileByOwnerKey.set(profileSpec.ownerKey, {
        id: profile.id,
        userId: profile.userId,
        planCode: profileSpec.planCode,
      });
    }

    await prisma.vendorServiceAgreement.deleteMany({
      where: {
        vendorProfileId: {
          in: Array.from(vendorProfileByOwnerKey.values()).map(
            (value) => value.id,
          ),
        },
      },
    });

    const agreementByOwnerKey = new Map<OwnerKey, string>();
    for (const [ownerKey, profile] of vendorProfileByOwnerKey.entries()) {
      const planCode = profile.planCode as 'FP_LIST' | 'FP_SEMI' | 'FP_FULL';
      const plan = servicePlanByCode.get(planCode);
      assert(plan, `Service plan missing for ${planCode}.`);

      const agreement = await prisma.vendorServiceAgreement.create({
        data: {
          vendorProfileId: profile.id,
          servicePlanId: plan.id,
          status: VendorAgreementStatus.ACTIVE,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          agreedManagementFeeBps: plan.managementFeeBps,
          notes: `Demo agreement mapped to ${plan.code}.`,
          approvedByAdminId: admin.id,
          approvedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        select: { id: true },
      });

      agreementByOwnerKey.set(ownerKey, agreement.id);
    }

    const amenityByKey = await seedAmenityCatalog(prisma);

    const propertyBySlug = new Map<
      string,
      {
        id: string;
        slug: string;
        title: string;
        minNights: number;
        basePrice: number;
        cleaningFee: number;
        vendorId: string;
      }
    >();

    for (let i = 0; i < PROPERTY_SPECS.length; i += 1) {
      const spec = PROPERTY_SPECS[i];
      const ownerUser = usersByKey.get(ownerUserKey(spec.ownerKey));
      assert(ownerUser, `Owner user missing for property ${spec.slug}.`);

      const vendorProfile = vendorProfileByOwnerKey.get(spec.ownerKey);
      assert(vendorProfile, `Vendor profile missing for owner ${spec.ownerKey}.`);

      const planCode = ownerPlanCode(spec.ownerKey);
      const plan = servicePlanByCode.get(planCode);
      assert(plan, `Service plan not found for property ${spec.slug}.`);

      const location = await prisma.location.create({
        data: {
          country: spec.country,
          city: spec.city,
          area: spec.community,
          name: spec.community,
          address: spec.addressLine1,
          lat: spec.lat,
          lng: spec.lng,
        },
        select: { id: true },
      });

      const propertyId = stableUuid(`demo-property:${spec.slug}`);
      const created = await prisma.property.create({
        data: {
          id: propertyId,
          vendorId: ownerUser.id,
          createdByAdminId: spec.ownerKey === 'admin.internal' ? admin.id : null,
          title: spec.title,
          slug: spec.slug,
          description: spec.description,
          city: spec.city,
          area: spec.community,
          address: spec.addressLine1,
          lat: spec.lat,
          lng: spec.lng,
          locationId: location.id,
          maxGuests: spec.maxGuests,
          bedrooms: spec.bedrooms,
          bathrooms: spec.bathrooms,
          basePrice: spec.basePrice,
          cleaningFee: spec.cleaningFee,
          currency: 'AED',
          minNights: spec.minNights,
          maxNights: 30,
          isInstantBook: spec.status === PropertyStatus.PUBLISHED,
          status: spec.status,
          createdAt: spec.createdAt,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          vendorId: true,
          minNights: true,
          basePrice: true,
          cleaningFee: true,
          status: true,
        },
      });

      propertyBySlug.set(created.slug, {
        id: created.id,
        slug: created.slug,
        title: created.title,
        minNights: created.minNights,
        basePrice: created.basePrice,
        cleaningFee: created.cleaningFee,
        vendorId: created.vendorId,
      });

      await prisma.propertyAvailabilitySettings.create({
        data: {
          propertyId: created.id,
          defaultMinNights: spec.minNights,
          defaultMaxNights: 30,
          advanceNoticeDays: 0,
          preparationDays: 0,
        },
      });

      await prisma.cancellationPolicyConfig.create({
        data: {
          propertyId: created.id,
          version: 'demo-policy-v1',
          isActive: true,
          freeCancelBeforeHours: 72,
          partialRefundBeforeHours: 48,
          noRefundWithinHours: 24,
          penaltyValue: 20,
        },
      });

      const agreementId = agreementByOwnerKey.get(spec.ownerKey) ?? null;
      await prisma.propertyServiceConfig.create({
        data: {
          propertyId: created.id,
          servicePlanId: plan.id,
          vendorAgreementId: agreementId,
          cleaningRequired: plan.includesCleaning,
          linenChangeRequired: plan.includesLinen,
          inspectionRequired: plan.includesInspection,
          restockRequired: plan.includesRestock,
          maintenanceIncluded: plan.includesMaintenance,
          guestCleaningFee: null,
          linenFee: null,
          inspectionFee: null,
          restockFee: null,
          currency: 'AED',
        },
      });

      const amenityIds = pickAmenityKeys(i)
        .map((key) => amenityByKey.get(key))
        .filter((id): id is string => typeof id === 'string');

      await prisma.propertyAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          propertyId: created.id,
          amenityId,
        })),
        skipDuplicates: true,
      });

      const blockedDays = blockedDaysForProperty(i);
      await prisma.propertyCalendarDay.createMany({
        data: blockedDays.map((day) => ({
          propertyId: created.id,
          date: day,
          status: CalendarDayStatus.BLOCKED,
          note: 'Demo owner block',
        })),
        skipDuplicates: true,
      });

      const mediaRows = await buildPropertyMediaRows({
        propertyId: created.id,
        propertyTitle: created.title,
        status: created.status,
        targetCount: mediaTargetCount(created.status, i),
      });

      if (mediaRows.length > 0) {
        await prisma.media.createMany({
          data: mediaRows.map((row) => ({
            id: row.id,
            propertyId: created.id,
            url: row.url,
            alt: row.alt,
            sortOrder: row.sortOrder,
            category: row.category,
          })),
        });
      }

      if (
        created.status === PropertyStatus.PUBLISHED ||
        created.status === PropertyStatus.UNDER_REVIEW ||
        created.status === PropertyStatus.REJECTED
      ) {
        const documentId = stableUuid(`demo-doc:${created.id}:ownership`);
        const ownerName =
          spec.ownerKey === 'admin.internal'
            ? 'Internal Inventory - RentPropertyUAE'
            : VENDOR_USERS.find((vendor) => vendor.key === spec.ownerKey)
                ?.fullName ?? 'Vendor';

        const generatedPdf = createOwnershipProofPdf({
          documentId,
          propertyTitle: created.title,
          ownerName,
          unitNumber: spec.unitNumber,
          buildingName: spec.buildingName,
          emiratesIdMasked: maskedEmiratesId(i),
          issuedAt: issuedDateForProperty(i),
        });

        const baseDocPath =
          spec.ownerKey === 'admin.internal'
            ? `/api/admin/properties/${created.id}/documents/${documentId}/download`
            : `/api/vendor/properties/${created.id}/documents/${documentId}/download`;

        await prisma.propertyDocument.create({
          data: {
            id: documentId,
            propertyId: created.id,
            type: PropertyDocumentType.OWNERSHIP_PROOF,
            uploadedByUserId: ownerUser.id,
            reviewedByAdminId:
              created.status === PropertyStatus.PUBLISHED ||
              created.status === PropertyStatus.REJECTED
                ? admin.id
                : null,
            storageKey: generatedPdf.storageKey,
            originalName: generatedPdf.originalName,
            mimeType: generatedPdf.mimeType,
            url: baseDocPath,
            createdAt: addDays(spec.createdAt, 2),
          },
        });
      }

      if (created.status === PropertyStatus.PUBLISHED) {
        await prisma.propertyReview.create({
          data: {
            id: stableUuid(`demo-review:${created.id}:approved`),
            propertyId: created.id,
            adminId: admin.id,
            decision: PropertyReviewDecision.APPROVE,
            notes:
              'Approved: ownership proof and media checklist validated for publication.',
            checklistJson: JSON.stringify({
              ownershipProof: true,
              mediaChecklistPassed: true,
              approvedBy: admin.id,
            }),
            createdAt: addDays(spec.createdAt, 3),
          },
        });
      }

      if (created.status === PropertyStatus.REJECTED) {
        await prisma.propertyReview.create({
          data: {
            id: stableUuid(`demo-review:${created.id}:rejected`),
            propertyId: created.id,
            adminId: admin.id,
            decision: PropertyReviewDecision.REJECT,
            notes: REJECTION_REASON,
            checklistJson: JSON.stringify({
              rejectedByAdminId: admin.id,
              rejectedAt: '2026-02-20T10:00:00.000Z',
              reason: REJECTION_REASON,
            }),
            createdAt: new Date('2026-02-20T10:00:00.000Z'),
          },
        });
      }
    }

    const customerByKey: Record<string, { id: string; email: string }> = {};
    for (const customer of CUSTOMER_USERS) {
      const row = usersByKey.get(customer.key);
      assert(row, `Customer key missing in map: ${customer.key}`);
      customerByKey[customer.key] = row;
    }

    const vendorByKey: Record<string, { id: string; email: string }> = {};
    for (const vendor of VENDOR_USERS) {
      const row = usersByKey.get(vendor.key);
      assert(row, `Vendor key missing in map: ${vendor.key}`);
      vendorByKey[vendor.key] = row;
    }

    const bookingResult = await seedDemoBookings({
      prisma,
      adminUserId: admin.id,
      propertyBySlug,
      customerByKey,
      vendorByKey,
      bookingWindowStart: BOOKING_WINDOW_START,
      bookingWindowEnd: BOOKING_WINDOW_END,
    });

    const otpTarget = usersByKey.get('customer.huda');
    if (otpTarget) {
      await prisma.notificationEvent.create({
        data: {
          type: NotificationType.EMAIL_VERIFICATION_OTP,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.SENT,
          entityType: 'USER',
          entityId: otpTarget.id,
          recipientUserId: otpTarget.id,
          payloadJson: JSON.stringify({
            code: '735291',
            expiresInMinutes: 10,
            context: 'demo-seed',
          }),
          attempts: 1,
          nextAttemptAt: new Date('2026-02-22T09:00:00.000Z'),
          createdAt: new Date('2026-02-22T09:00:00.000Z'),
          sentAt: new Date('2026-02-22T09:00:00.000Z'),
        },
      });
    }

    await verifyDemoSeed(prisma, {
      adminEmail: ADMIN_USER.email,
      vendorEmails: VENDOR_USERS.map((vendor) => vendor.email),
      customerEmails: CUSTOMER_USERS.map((customer) => customer.email),
      propertySlugPrefix: DEMO_PROPERTY_SLUG_PREFIX,
      bookingWindowStart: BOOKING_WINDOW_START,
      bookingWindowEnd: BOOKING_WINDOW_END,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[demo-seed] Seeded ${PROPERTY_SPECS.length} properties and ${bookingResult.bookingIds.length} bookings in demo mode.`,
    );

    printDemoLoginBanner();
  } finally {
    await prisma.$disconnect();
  }
}
