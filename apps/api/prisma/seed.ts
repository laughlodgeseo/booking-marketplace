import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PRIVATE_UPLOADS_DIR } from '../src/common/upload/storage-paths';
import {
  ActivationInvoiceStatus,
  BookingDocumentType,
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
  LocaleCode,
  MessageCounterpartyRole,
  NotificationType,
  OpsTaskStatus,
  OpsTaskType,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PrismaClient,
  PropertyDocumentType,
  PropertyMediaCategory,
  PropertyReviewDecision,
  PropertyStatus,
  RefundReason,
  RefundStatus,
  ServicePlanType,
  UserRole,
  VendorAgreementStatus,
  VendorStatementStatus,
  VendorStatus,
  PayoutStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PASSWORD = (process.env.SEED_PASSWORD ?? 'Password123!').trim();
const DB_CONNECT_MAX_ATTEMPTS = 3;
const DB_CONNECT_RETRY_DELAY_MS = 2_000;
const SEED_RUN_MAX_ATTEMPTS = 3;
const SEED_RUN_RETRY_DELAY_MS = 3_000;

const TARGET_COUNTS = {
  vendors: 4,
  customers: 10,
  properties: 15,
  vendorOwnedProperties: 12,
  adminOwnedProperties: 3,
  completedBookings: 10,
  confirmedBookings: 26,
  pendingBookings: 8,
  cancelledBookings: 6,
};

if (
  TARGET_COUNTS.vendorOwnedProperties + TARGET_COUNTS.adminOwnedProperties !==
  TARGET_COUNTS.properties
) {
  throw new Error(
    'Seed config invalid: vendorOwnedProperties + adminOwnedProperties must equal total properties.',
  );
}

const BOOKING_WINDOW_START = new Date(Date.UTC(2026, 1, 14, 12, 0, 0));
const BOOKING_WINDOW_END = new Date(Date.UTC(2026, 2, 15, 12, 0, 0));

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const PRIVATE_UPLOAD_BASES = [PRIVATE_UPLOADS_DIR];

const DUBAI_AREAS = [
  { city: 'Dubai', area: 'Downtown Dubai', lat: 25.1972, lng: 55.2744 },
  { city: 'Dubai', area: 'Dubai Marina', lat: 25.0772, lng: 55.1406 },
  { city: 'Dubai', area: 'Palm Jumeirah', lat: 25.1124, lng: 55.139 },
  { city: 'Dubai', area: 'JBR', lat: 25.0785, lng: 55.1333 },
  { city: 'Dubai', area: 'Business Bay', lat: 25.185, lng: 55.269 },
  { city: 'Dubai', area: 'DIFC', lat: 25.2132, lng: 55.2796 },
  { city: 'Dubai', area: 'JLT', lat: 25.0686, lng: 55.1423 },
  { city: 'Dubai', area: 'Al Barsha', lat: 25.1052, lng: 55.1951 },
  { city: 'Dubai', area: 'City Walk', lat: 25.2046, lng: 55.256 },
  { city: 'Dubai', area: 'Creek Harbour', lat: 25.1978, lng: 55.3322 },
  { city: 'Dubai', area: 'Jumeirah Village Circle', lat: 25.0602, lng: 55.2083 },
  { city: 'Dubai', area: 'Dubai Hills', lat: 25.0816, lng: 55.2401 },
  { city: 'Dubai', area: 'Bluewaters Island', lat: 25.0829, lng: 55.1205 },
  { city: 'Dubai', area: 'Meydan', lat: 25.1574, lng: 55.2915 },
  { city: 'Dubai', area: 'Al Wasl', lat: 25.2068, lng: 55.2527 },
] as const;

const AREA_TRANSLATIONS_AR: Record<string, string> = {
  'Downtown Dubai': 'وسط مدينة دبي',
  'Dubai Marina': 'دبي مارينا',
  'Palm Jumeirah': 'نخلة جميرا',
  JBR: 'جميرا بيتش ريزيدنس',
  'Business Bay': 'الخليج التجاري',
  DIFC: 'مركز دبي المالي العالمي',
  JLT: 'أبراج بحيرات الجميرا',
  'Al Barsha': 'البرشاء',
  'City Walk': 'سيتي ووك',
  'Creek Harbour': 'خور دبي هاربر',
  'Jumeirah Village Circle': 'قرية جميرا الدائرية',
  'Dubai Hills': 'دبي هيلز',
  'Bluewaters Island': 'جزيرة بلوواترز',
  Meydan: 'ميدان',
  'Al Wasl': 'الوصل',
};

const DUBAI_PROPERTY_IMAGE_IDS = [
  'photo-1512453979798-5ea266f8880c',
  'photo-1518684079-3c830dcef090',
  'photo-1526495124232-a04e1849168c',
  'photo-1546412414-8035e1776c9a',
  'photo-1505693416388-ac5ce068fe85',
  'photo-1522708323590-d24dbb6b0267',
  'photo-1502672260266-1c1ef2d93688',
  'photo-1484154218962-a197022b5858',
  'photo-1512917774080-9991f1c4c750',
  'photo-1505691938895-1758d7feb511',
  'photo-1524758631624-e2822e304c36',
  'photo-1501183638710-841dd1904471',
  'photo-1507089947368-19c1da9775ae',
  'photo-1493809842364-78817add7ffb',
  'photo-1502005229762-cf1b2da7c5d6',
  'photo-1549187774-b4e9b0445b41',
  'photo-1523217582562-09d0def993a6',
  'photo-1560067174-8943bd8f1fbd',
  'photo-1526498460520-4c246339dccb',
  'photo-1534237710431-e2fc698436d0',
] as const;

const PROPERTY_TITLE_STEMS = [
  'Burj View Signature Suite',
  'Marina Horizon Residence',
  'Palm Waterfront Escape',
  'Canal Luxe Apartment',
  'Downtown Executive Loft',
  'Skyline Family Residence',
  'Bluewaters Premium Stay',
  'Dubai Hills Designer Home',
  'JBR Sea Breeze Apartment',
  'Business Bay Modern Retreat',
  'City Walk Urban Penthouse',
  'Meydan Golf View Residence',
] as const;

const PROPERTY_TITLE_STEMS_AR: Record<string, string> = {
  'Burj View Signature Suite': 'جناح فاخر بإطلالة برج خليفة',
  'Marina Horizon Residence': 'إقامة أفق المارينا',
  'Palm Waterfront Escape': 'ملاذ فاخر على الواجهة البحرية في النخلة',
  'Canal Luxe Apartment': 'شقة فاخرة بإطلالة القناة',
  'Downtown Executive Loft': 'لوفت تنفيذي في وسط دبي',
  'Skyline Family Residence': 'إقامة عائلية بإطلالة الأفق',
  'Bluewaters Premium Stay': 'إقامة بريميوم في بلوواترز',
  'Dubai Hills Designer Home': 'منزل تصميمي في دبي هيلز',
  'JBR Sea Breeze Apartment': 'شقة نسيم البحر في جميرا بيتش ريزيدنس',
  'Business Bay Modern Retreat': 'ملاذ عصري في الخليج التجاري',
  'City Walk Urban Penthouse': 'بنتهاوس حضري في سيتي ووك',
  'Meydan Golf View Residence': 'إقامة بإطلالة ملعب الجولف في ميدان',
};

const REVIEW_TITLES = [
  'Excellent managed stay',
  'Great location and cleanliness',
  'Smooth check-in and support',
  'Premium apartment experience',
  'Would book again in Dubai',
] as const;

const REVIEW_COMMENTS = [
  'The apartment matched the listing, was very clean, and communication was quick.',
  'Great location near transport and restaurants. Professional hosting team.',
  'Everything was organized and backend-confirmed before arrival. Very smooth stay.',
  'Well furnished, comfortable beds, and a reliable check-in process.',
  'Strong value for Dubai standards. Support team handled requests promptly.',
] as const;

const VENDOR_COMPANIES = [
  'Al Noor Stays',
  'Dar Al Sahel Homes',
  'Masaar Holiday Homes',
  'Wahat Al Bahr Rentals',
] as const;

const CUSTOMER_FULL_NAMES = [
  'Omar Al Mansoori',
  'Fatima Al Suwaidi',
  'Mariam Al Kaabi',
  'Yousef Al Hammadi',
  'Sara Al Mazrouei',
  'Khalid Al Nuaimi',
  'Noora Al Dhaheri',
  'Hamad Al Marri',
  'Aisha Al Falasi',
  'Rashid Al Ketbi',
] as const;

type SeedAmenity = {
  key: string;
  name: string;
  groupKey: string;
  sortOrder: number;
};

type SeedAmenityGroup = { key: string; name: string; sortOrder: number };

const AMENITY_GROUPS: readonly SeedAmenityGroup[] = [
  { key: 'ESSENTIALS', name: 'Essentials', sortOrder: 10 },
  { key: 'KITCHEN', name: 'Kitchen', sortOrder: 20 },
  { key: 'BATHROOM', name: 'Bathroom', sortOrder: 30 },
  { key: 'BEDROOM_LAUNDRY', name: 'Bedroom & Laundry', sortOrder: 40 },
  { key: 'HEATING_COOLING', name: 'Heating & Cooling', sortOrder: 50 },
  { key: 'ENTERTAINMENT', name: 'Entertainment', sortOrder: 60 },
  { key: 'FAMILY', name: 'Family', sortOrder: 70 },
  { key: 'BUILDING', name: 'Building', sortOrder: 80 },
  { key: 'OUTDOOR', name: 'Outdoor', sortOrder: 90 },
  { key: 'SAFETY', name: 'Safety', sortOrder: 100 },
] as const;

const AMENITY_GROUPS_AR: Record<string, string> = {
  ESSENTIALS: 'الأساسيات',
  KITCHEN: 'المطبخ',
  BATHROOM: 'الحمّام',
  BEDROOM_LAUNDRY: 'غرفة النوم والغسيل',
  HEATING_COOLING: 'التدفئة والتكييف',
  ENTERTAINMENT: 'الترفيه',
  FAMILY: 'مناسب للعائلات',
  BUILDING: 'مرافق المبنى',
  OUTDOOR: 'المساحات الخارجية',
  SAFETY: 'السلامة',
};

const AMENITIES: readonly SeedAmenity[] = [
  { key: 'WIFI', name: 'Wi-Fi', groupKey: 'ESSENTIALS', sortOrder: 10 },
  { key: 'TOWELS', name: 'Towels', groupKey: 'ESSENTIALS', sortOrder: 20 },
  { key: 'BED_LINENS', name: 'Bed linens', groupKey: 'ESSENTIALS', sortOrder: 30 },
  { key: 'SHAMPOO', name: 'Shampoo', groupKey: 'ESSENTIALS', sortOrder: 40 },
  { key: 'BASIC_TOILETRIES', name: 'Basic toiletries', groupKey: 'ESSENTIALS', sortOrder: 50 },
  { key: 'KITCHEN', name: 'Kitchen', groupKey: 'KITCHEN', sortOrder: 10 },
  { key: 'REFRIGERATOR', name: 'Refrigerator', groupKey: 'KITCHEN', sortOrder: 20 },
  { key: 'MICROWAVE', name: 'Microwave', groupKey: 'KITCHEN', sortOrder: 30 },
  { key: 'OVEN', name: 'Oven', groupKey: 'KITCHEN', sortOrder: 40 },
  { key: 'STOVE', name: 'Stove', groupKey: 'KITCHEN', sortOrder: 50 },
  { key: 'KETTLE', name: 'Kettle', groupKey: 'KITCHEN', sortOrder: 60 },
  { key: 'COFFEE_MAKER', name: 'Coffee maker', groupKey: 'KITCHEN', sortOrder: 70 },
  { key: 'DISHES_CUTLERY', name: 'Dishes & cutlery', groupKey: 'KITCHEN', sortOrder: 80 },
  { key: 'HOT_WATER', name: 'Hot water', groupKey: 'BATHROOM', sortOrder: 10 },
  { key: 'HAIR_DRYER', name: 'Hair dryer', groupKey: 'BATHROOM', sortOrder: 20 },
  { key: 'HANGERS', name: 'Hangers', groupKey: 'BEDROOM_LAUNDRY', sortOrder: 10 },
  { key: 'IRON', name: 'Iron', groupKey: 'BEDROOM_LAUNDRY', sortOrder: 20 },
  { key: 'WASHING_MACHINE', name: 'Washing machine', groupKey: 'BEDROOM_LAUNDRY', sortOrder: 30 },
  { key: 'AIR_CONDITIONING', name: 'Air conditioning', groupKey: 'HEATING_COOLING', sortOrder: 10 },
  { key: 'HEATING', name: 'Heating', groupKey: 'HEATING_COOLING', sortOrder: 20 },
  { key: 'TV', name: 'TV', groupKey: 'ENTERTAINMENT', sortOrder: 10 },
  { key: 'NETFLIX', name: 'Netflix', groupKey: 'ENTERTAINMENT', sortOrder: 20 },
  { key: 'BABY_COT', name: 'Baby cot / crib', groupKey: 'FAMILY', sortOrder: 10 },
  { key: 'HIGH_CHAIR', name: 'High chair', groupKey: 'FAMILY', sortOrder: 20 },
  { key: 'ELEVATOR', name: 'Elevator', groupKey: 'BUILDING', sortOrder: 10 },
  { key: 'GYM', name: 'Gym', groupKey: 'BUILDING', sortOrder: 20 },
  { key: 'POOL', name: 'Pool', groupKey: 'BUILDING', sortOrder: 30 },
  { key: 'PARKING', name: 'Free parking', groupKey: 'BUILDING', sortOrder: 40 },
  { key: 'DOORMAN', name: 'Doorman', groupKey: 'BUILDING', sortOrder: 50 },
  { key: 'BALCONY', name: 'Balcony', groupKey: 'OUTDOOR', sortOrder: 10 },
  { key: 'SMOKE_ALARM', name: 'Smoke alarm', groupKey: 'SAFETY', sortOrder: 10 },
  { key: 'FIRE_EXTINGUISHER', name: 'Fire extinguisher', groupKey: 'SAFETY', sortOrder: 20 },
  { key: 'FIRST_AID_KIT', name: 'First aid kit', groupKey: 'SAFETY', sortOrder: 30 },
] as const;

const AMENITIES_AR: Record<string, string> = {
  WIFI: 'واي فاي',
  TOWELS: 'مناشف',
  BED_LINENS: 'بياضات سرير',
  SHAMPOO: 'شامبو',
  BASIC_TOILETRIES: 'مستلزمات استحمام أساسية',
  KITCHEN: 'مطبخ',
  REFRIGERATOR: 'ثلاجة',
  MICROWAVE: 'مايكروويف',
  OVEN: 'فرن',
  STOVE: 'موقد',
  KETTLE: 'غلاية',
  COFFEE_MAKER: 'آلة قهوة',
  DISHES_CUTLERY: 'أوانٍ وأدوات مائدة',
  HOT_WATER: 'ماء ساخن',
  HAIR_DRYER: 'مجفف شعر',
  HANGERS: 'علاّقات',
  IRON: 'مكواة',
  WASHING_MACHINE: 'غسالة',
  AIR_CONDITIONING: 'تكييف',
  HEATING: 'تدفئة',
  TV: 'تلفاز',
  NETFLIX: 'نتفليكس',
  BABY_COT: 'سرير أطفال',
  HIGH_CHAIR: 'كرسي أطفال مرتفع',
  ELEVATOR: 'مصعد',
  GYM: 'صالة رياضية',
  POOL: 'مسبح',
  PARKING: 'موقف سيارات مجاني',
  DOORMAN: 'بواب',
  BALCONY: 'شرفة',
  SMOKE_ALARM: 'جهاز إنذار دخان',
  FIRE_EXTINGUISHER: 'طفاية حريق',
  FIRST_AID_KIT: 'حقيبة إسعافات أولية',
};

type SeedVendor = {
  userId: string;
  email: string;
  fullName: string;
  vendorProfileId: string;
  agreementId: string;
  planCode: 'FP_LIST' | 'FP_SEMI' | 'FP_FULL';
};

type SeedProperty = {
  id: string;
  slug: string;
  title: string;
  status: PropertyStatus;
  vendorId: string;
  basePrice: number;
  cleaningFee: number;
  city: string;
  area: string | null;
};

type SeedBooking = {
  id: string;
  propertyId: string;
  customerId: string;
  status: BookingStatus;
  checkIn: Date;
  checkOut: Date;
  totalAmount: number;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function translateAreaToArabic(area: string): string {
  return AREA_TRANSLATIONS_AR[area] ?? area;
}

function translateTitleStemToArabic(titleStem: string): string {
  return PROPERTY_TITLE_STEMS_AR[titleStem] ?? titleStem;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function shuffle<T>(rand: () => number, input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const left = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = left;
  }
  return arr;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * ONE_DAY_MS);
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function startOfUtcDay(input = new Date()): Date {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
}

function toIsoDay(input: Date): string {
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, '0');
  const d = String(input.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function unsplashUrl(id: string, width = 2200): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=84`;
}

function ensureSeedStorageDirs() {
  for (const base of PRIVATE_UPLOAD_BASES) {
    const propertyDocs = join(base, 'properties', 'documents');
    const bookingDocs = join(base, 'bookings', 'documents');

    rmSync(propertyDocs, { recursive: true, force: true });
    rmSync(bookingDocs, { recursive: true, force: true });

    mkdirSync(propertyDocs, { recursive: true });
    mkdirSync(bookingDocs, { recursive: true });
  }
}

function buildPdfBuffer(text: string): Buffer {
  const safeText = text
    .slice(0, 80)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  const stream = `BT\n/F1 14 Tf\n50 780 Td\n(${safeText}) Tj\nET`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += obj;
  }

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, 'utf8');
}

function createSeedPdf(scope: 'properties' | 'bookings', label: string) {
  const storageKey = `${randomUUID()}.pdf`;
  const originalName = `${label}.pdf`;
  const payload = buildPdfBuffer(`Luxivo Seed Document: ${label}`);

  for (const base of PRIVATE_UPLOAD_BASES) {
    const abs = join(base, scope, 'documents', storageKey);
    writeFileSync(abs, payload);
  }

  return {
    storageKey,
    originalName,
    mimeType: 'application/pdf',
  };
}

async function cleanAll() {
  await prisma.workOrder.deleteMany().catch(() => undefined);
  await prisma.maintenanceRequest.deleteMany().catch(() => undefined);
  await prisma.opsTask.deleteMany().catch(() => undefined);

  await prisma.message.deleteMany().catch(() => undefined);
  await prisma.messageThread.deleteMany().catch(() => undefined);

  await prisma.guestReview.deleteMany().catch(() => undefined);
  await prisma.bookingDocument.deleteMany().catch(() => undefined);

  await prisma.propertyUnpublishRequest.deleteMany().catch(() => undefined);
  await prisma.propertyDeletionRequest.deleteMany().catch(() => undefined);
  await prisma.propertyReview.deleteMany().catch(() => undefined);
  await prisma.propertyDocument.deleteMany().catch(() => undefined);
  await prisma.media.deleteMany().catch(() => undefined);

  await prisma.paymentEvent.deleteMany().catch(() => undefined);
  await prisma.ledgerEntry.deleteMany().catch(() => undefined);
  await prisma.payout.deleteMany().catch(() => undefined);
  await prisma.vendorStatement.deleteMany().catch(() => undefined);

  await prisma.securityDeposit.deleteMany().catch(() => undefined);
  await prisma.refund.deleteMany().catch(() => undefined);
  await prisma.payment.deleteMany().catch(() => undefined);

  await prisma.bookingCancellation.deleteMany().catch(() => undefined);
  await prisma.bookingIdempotency.deleteMany().catch(() => undefined);
  await prisma.booking.deleteMany().catch(() => undefined);

  await prisma.propertyHold.deleteMany().catch(() => undefined);
  await prisma.propertyCalendarDay.deleteMany().catch(() => undefined);
  await prisma.propertyAvailabilitySettings.deleteMany().catch(() => undefined);
  await prisma.cancellationPolicyConfig.deleteMany().catch(() => undefined);
  await prisma.securityDepositPolicy.deleteMany().catch(() => undefined);

  await prisma.propertyAmenity.deleteMany().catch(() => undefined);
  await prisma.propertyServiceConfig.deleteMany().catch(() => undefined);

  await prisma.propertyTranslation.deleteMany().catch(() => undefined);
  await prisma.amenityTranslation.deleteMany().catch(() => undefined);
  await prisma.amenityGroupTranslation.deleteMany().catch(() => undefined);

  await prisma.fxSnapshot.deleteMany().catch(() => undefined);
  await prisma.fxRate.deleteMany().catch(() => undefined);
  await prisma.notificationEvent.deleteMany().catch(() => undefined);

  await prisma.property.deleteMany().catch(() => undefined);

  await prisma.vendorServiceAgreement.deleteMany().catch(() => undefined);
  await prisma.servicePlan.deleteMany().catch(() => undefined);

  await prisma.amenity.deleteMany().catch(() => undefined);
  await prisma.amenityGroup.deleteMany().catch(() => undefined);

  await prisma.location.deleteMany().catch(() => undefined);

  await prisma.vendorProfile.deleteMany().catch(() => undefined);
  await prisma.refreshToken.deleteMany().catch(() => undefined);
  await prisma.passwordResetToken.deleteMany().catch(() => undefined);
  await prisma.emailVerificationToken.deleteMany().catch(() => undefined);
  await prisma.user.deleteMany().catch(() => undefined);
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
}

function hasPrismaCode(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const maybeError = error as { code?: unknown };
  return maybeError.code === code;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function preflightDatabaseConnection() {
  for (let attempt = 1; attempt <= DB_CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      // eslint-disable-next-line no-console
      console.log(
        `[seed] DB preflight: connecting (attempt ${attempt}/${DB_CONNECT_MAX_ATTEMPTS})...`,
      );
      await prisma.$connect();
      // eslint-disable-next-line no-console
      console.log('[seed] DB preflight: connection established.');
      return;
    } catch (error: unknown) {
      const message = errorToMessage(error);
      if (attempt >= DB_CONNECT_MAX_ATTEMPTS) {
        throw new Error(
          `DB unreachable; check Render allowlist/status/network. Last error: ${message}`,
        );
      }
      // eslint-disable-next-line no-console
      console.warn(
        `[seed] DB preflight failed on attempt ${attempt}/${DB_CONNECT_MAX_ATTEMPTS}: ${message}`,
      );
      await wait(DB_CONNECT_RETRY_DELAY_MS);
    }
  }
}

async function seedAmenityCatalog() {
  for (const g of AMENITY_GROUPS) {
    await prisma.amenityGroup.upsert({
      where: { key: g.key },
      create: { key: g.key, name: g.name, sortOrder: g.sortOrder, isActive: true },
      update: { name: g.name, sortOrder: g.sortOrder, isActive: true },
    });
  }

  const groups = await prisma.amenityGroup.findMany({
    where: { isActive: true },
    select: { id: true, key: true },
  });
  const groupByKey = new Map(groups.map((x) => [x.key, x.id]));
  const groupSourceByKey = new Map(AMENITY_GROUPS.map((g) => [g.key, g]));

  for (const group of groups) {
    const source = groupSourceByKey.get(group.key);
    if (!source) continue;
    const arName = AMENITY_GROUPS_AR[group.key] ?? source.name;

    await prisma.amenityGroupTranslation.upsert({
      where: {
        amenityGroupId_locale: {
          amenityGroupId: group.id,
          locale: LocaleCode.en,
        },
      },
      update: { name: source.name },
      create: {
        amenityGroupId: group.id,
        locale: LocaleCode.en,
        name: source.name,
      },
    });

    await prisma.amenityGroupTranslation.upsert({
      where: {
        amenityGroupId_locale: {
          amenityGroupId: group.id,
          locale: LocaleCode.ar,
        },
      },
      update: { name: arName },
      create: {
        amenityGroupId: group.id,
        locale: LocaleCode.ar,
        name: arName,
      },
    });
  }

  function groupId(key: string) {
    const id = groupByKey.get(key);
    if (!id) throw new Error(`Amenity group missing: ${key}`);
    return id;
  }

  for (const amenity of AMENITIES) {
    await prisma.amenity.upsert({
      where: { key: amenity.key },
      create: {
        key: amenity.key,
        name: amenity.name,
        icon: null,
        groupId: groupId(amenity.groupKey),
        sortOrder: amenity.sortOrder,
        isActive: true,
      },
      update: {
        name: amenity.name,
        groupId: groupId(amenity.groupKey),
        sortOrder: amenity.sortOrder,
        isActive: true,
      },
    });
  }

  const all = await prisma.amenity.findMany({
    select: { id: true, key: true },
  });
  const amenitySourceByKey = new Map(AMENITIES.map((a) => [a.key, a]));

  for (const amenity of all) {
    const source = amenitySourceByKey.get(amenity.key);
    if (!source) continue;
    const arName = AMENITIES_AR[amenity.key] ?? source.name;

    await prisma.amenityTranslation.upsert({
      where: {
        amenityId_locale: {
          amenityId: amenity.id,
          locale: LocaleCode.en,
        },
      },
      update: { name: source.name },
      create: {
        amenityId: amenity.id,
        locale: LocaleCode.en,
        name: source.name,
      },
    });

    await prisma.amenityTranslation.upsert({
      where: {
        amenityId_locale: {
          amenityId: amenity.id,
          locale: LocaleCode.ar,
        },
      },
      update: { name: arName },
      create: {
        amenityId: amenity.id,
        locale: LocaleCode.ar,
        name: arName,
      },
    });
  }

  return {
    amenityByKey: new Map(all.map((x) => [x.key, x.id])),
  };
}

async function seedServicePlans() {
  const plans = [
    {
      code: 'FP_LIST',
      type: ServicePlanType.LISTING_ONLY,
      name: 'Listing Only',
      description: 'Managed listing and reservations. Owner handles on-ground operations.',
      managementFeeBps: 0,
      includesCleaning: false,
      includesLinen: false,
      includesInspection: false,
      includesRestock: false,
      includesMaintenance: false,
      isActive: true,
    },
    {
      code: 'FP_SEMI',
      type: ServicePlanType.SEMI_MANAGED,
      name: 'Semi-Managed',
      description: 'Bookings plus core operations with shared owner responsibility.',
      managementFeeBps: 1500,
      includesCleaning: true,
      includesLinen: true,
      includesInspection: true,
      includesRestock: false,
      includesMaintenance: true,
      isActive: true,
    },
    {
      code: 'FP_FULL',
      type: ServicePlanType.FULLY_MANAGED,
      name: 'Fully Managed',
      description: 'End-to-end operations, compliance, and guest experience management.',
      managementFeeBps: 1900,
      includesCleaning: true,
      includesLinen: true,
      includesInspection: true,
      includesRestock: true,
      includesMaintenance: true,
      isActive: true,
    },
  ] as const;

  for (const plan of plans) {
    await prisma.servicePlan.upsert({
      where: { code: plan.code },
      create: plan,
      update: plan,
    });
  }

  const seeded = await prisma.servicePlan.findMany();
  const byCode = new Map(seeded.map((x) => [x.code, x]));

  const list = byCode.get('FP_LIST');
  const semi = byCode.get('FP_SEMI');
  const full = byCode.get('FP_FULL');

  if (!list || !semi || !full) {
    throw new Error('Service plans were not seeded correctly.');
  }

  return { list, semi, full };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Put it in apps/api/.env');
  }

  await preflightDatabaseConnection();

  const rand = mulberry32(20260211);
  const now = new Date();
  const today = startOfUtcDay(now);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  ensureSeedStorageDirs();
  await cleanAll();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      role: UserRole.ADMIN,
      fullName: 'Luxivo Operator Admin',
      isEmailVerified: true,
    },
  });

  const vendorUsers = [] as Array<{ id: string; email: string; fullName: string }>;
  const vendorProfiles = [] as Array<{ id: string }>;

  for (let i = 0; i < TARGET_COUNTS.vendors; i++) {
    const company = VENDOR_COMPANIES[i] ?? `Vendor Company ${i + 1}`;
    const fullName = `${company} Team`;
    const email = `vendor${String(i + 1).padStart(2, '0')}@demo.com`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.VENDOR,
        fullName,
        isEmailVerified: true,
      },
      select: { id: true, email: true, fullName: true },
    });

    const profile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        displayName: company,
        companyName: company,
        phone: `+971 50 ${String(1000000 + i * 331).slice(-7)}`,
        status: VendorStatus.APPROVED,
      },
      select: { id: true },
    });

    vendorUsers.push({
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? company,
    });
    vendorProfiles.push(profile);
  }

  const customers = [] as Array<{ id: string; email: string; fullName: string }>;
  for (let i = 0; i < TARGET_COUNTS.customers; i++) {
    const fullName = CUSTOMER_FULL_NAMES[i] ?? `Customer ${i + 1}`;
    const user = await prisma.user.create({
      data: {
        email: `customer${String(i + 1).padStart(2, '0')}@demo.com`,
        passwordHash,
        role: UserRole.CUSTOMER,
        fullName,
        isEmailVerified: true,
      },
      select: { id: true, email: true, fullName: true },
    });

    customers.push({
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? fullName,
    });
  }

  const { amenityByKey } = await seedAmenityCatalog();
  const { list, semi, full } = await seedServicePlans();

  const vendorPlanCodes: Array<'FP_LIST' | 'FP_SEMI' | 'FP_FULL'> = vendorUsers.map(
    (_, index) => {
      const cycle = index % 3;
      if (cycle === 0) return 'FP_FULL';
      if (cycle === 1) return 'FP_SEMI';
      return 'FP_LIST';
    },
  );

  const seededVendors: SeedVendor[] = [];
  for (let i = 0; i < vendorUsers.length; i++) {
    const vendor = vendorUsers[i] as { id: string; email: string; fullName: string };
    const profile = vendorProfiles[i] as { id: string };
    const code = vendorPlanCodes[i] as 'FP_LIST' | 'FP_SEMI' | 'FP_FULL';
    const plan = code === 'FP_LIST' ? list : code === 'FP_SEMI' ? semi : full;

    const agreement = await prisma.vendorServiceAgreement.create({
      data: {
        vendorProfileId: profile.id,
        servicePlanId: plan.id,
        status: VendorAgreementStatus.ACTIVE,
        startDate: addDays(today, -120),
        endDate: null,
        agreedManagementFeeBps: plan.managementFeeBps,
        notes: `Seeded agreement for ${plan.name}.`,
        approvedByAdminId: admin.id,
        approvedAt: addDays(today, -121),
      },
      select: { id: true },
    });

    seededVendors.push({
      userId: vendor.id,
      email: vendor.email,
      fullName: vendor.fullName,
      vendorProfileId: profile.id,
      agreementId: agreement.id,
      planCode: code,
    });
  }

  const statusPool: PropertyStatus[] = shuffle(rand, [
    ...Array.from({ length: 7 }, () => PropertyStatus.PUBLISHED),
    ...Array.from({ length: 3 }, () => PropertyStatus.APPROVED),
    ...Array.from(
      { length: 1 },
      () => PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT,
    ),
    ...Array.from({ length: 2 }, () => PropertyStatus.UNDER_REVIEW),
    ...Array.from({ length: 1 }, () => PropertyStatus.CHANGES_REQUESTED),
    ...Array.from({ length: 1 }, () => PropertyStatus.DRAFT),
  ]);

  const amenityProfiles: readonly string[][] = [
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'REFRIGERATOR', 'MICROWAVE', 'ELEVATOR', 'POOL', 'GYM', 'PARKING', 'BALCONY'],
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'OVEN', 'COFFEE_MAKER', 'DISHES_CUTLERY', 'DOORMAN', 'POOL', 'SMOKE_ALARM'],
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'REFRIGERATOR', 'PARKING', 'BALCONY', 'SMOKE_ALARM', 'FIRE_EXTINGUISHER', 'FIRST_AID_KIT'],
    ['WIFI', 'AIR_CONDITIONING', 'TV', 'KITCHEN', 'MICROWAVE', 'ELEVATOR', 'GYM', 'NETFLIX', 'WASHING_MACHINE', 'HOT_WATER'],
  ] as const;

  const properties: SeedProperty[] = [];

  for (let i = 0; i < TARGET_COUNTS.properties; i++) {
    const vendor = seededVendors[i % seededVendors.length] as SeedVendor;
    const isAdminOwned = i >= TARGET_COUNTS.vendorOwnedProperties;
    const area = pick(rand, DUBAI_AREAS);
    const titleStem = pick(rand, PROPERTY_TITLE_STEMS);

    const bedrooms = clamp(1 + Math.floor(rand() * 5), 1, 5);
    const bathrooms = clamp(1 + Math.floor(rand() * 4), 1, 4);
    const maxGuests = clamp(2 + bedrooms + Math.floor(rand() * 3), 2, 10);

    const nightlyAed = clamp(
      420 + bedrooms * 230 + Math.floor(rand() * 1200),
      420,
      bedrooms >= 4 ? 4200 : 2600,
    );

    const basePrice = nightlyAed * 100;
    const cleaningFee = clamp(120 + bedrooms * 45 + Math.floor(rand() * 180), 120, 650) * 100;

    const status = statusPool[i] as PropertyStatus;
    const slug = `${slugify(`${titleStem} ${area.area}`)}-${String(i + 1).padStart(2, '0')}`;
    const titleEn = `${titleStem} • ${area.area}`;
    const areaAr = translateAreaToArabic(area.area);
    const titleAr = `${translateTitleStemToArabic(titleStem)} • ${areaAr}`;
    const descriptionEn =
      'Professionally managed Dubai stay with backend-verified availability, audited pricing, and premium guest support.';
    const descriptionAr =
      `إقامة مُدارة باحتراف في ${areaAr} بدبي، مع توافر مُتحقق منه، تسعير واضح، ودعم ضيافة متميّز.`;

    const lat = area.lat + (rand() - 0.5) * 0.018;
    const lng = area.lng + (rand() - 0.5) * 0.018;

    const mediaData = [
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 2600),
        alt: `${area.area} cover`,
        sortOrder: 0,
        category: PropertyMediaCategory.COVER,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} living room`,
        sortOrder: 1,
        category: PropertyMediaCategory.LIVING_ROOM,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} bedroom`,
        sortOrder: 2,
        category: PropertyMediaCategory.BEDROOM,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} bathroom`,
        sortOrder: 3,
        category: PropertyMediaCategory.BATHROOM,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} kitchen`,
        sortOrder: 4,
        category: PropertyMediaCategory.KITCHEN,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} balcony`,
        sortOrder: 5,
        category: PropertyMediaCategory.BALCONY,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} view`,
        sortOrder: 6,
        category: PropertyMediaCategory.VIEW,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} building exterior`,
        sortOrder: 7,
        category: PropertyMediaCategory.EXTERIOR,
      },
      {
        url: unsplashUrl(pick(rand, DUBAI_PROPERTY_IMAGE_IDS), 1800),
        alt: `${area.area} amenities`,
        sortOrder: 8,
        category: PropertyMediaCategory.AMENITY,
      },
    ];

    const created = await prisma.property.create({
      data: {
        vendorId: isAdminOwned ? admin.id : vendor.userId,
        createdByAdminId: isAdminOwned ? admin.id : null,
        title: titleEn,
        slug,
        description: descriptionEn,
        city: area.city,
        area: area.area,
        address: `${Math.floor(10 + rand() * 80)} ${area.area}, Dubai`,
        lat,
        lng,

        maxGuests,
        bedrooms,
        bathrooms,

        basePrice,
        cleaningFee,
        currency: 'AED',

        minNights: clamp(1 + Math.floor(rand() * 4), 1, 5),
        maxNights: null,
        isInstantBook: rand() > 0.65,

        status,

        media: {
          createMany: {
            data: mediaData,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        vendorId: true,
        basePrice: true,
        cleaningFee: true,
        city: true,
        area: true,
      },
    });

    await prisma.propertyTranslation.upsert({
      where: {
        propertyId_locale: {
          propertyId: created.id,
          locale: LocaleCode.en,
        },
      },
      update: {
        title: titleEn,
        description: descriptionEn,
        areaLabel: area.area,
      },
      create: {
        propertyId: created.id,
        locale: LocaleCode.en,
        title: titleEn,
        description: descriptionEn,
        areaLabel: area.area,
      },
    });

    await prisma.propertyTranslation.upsert({
      where: {
        propertyId_locale: {
          propertyId: created.id,
          locale: LocaleCode.ar,
        },
      },
      update: {
        title: titleAr,
        description: descriptionAr,
        areaLabel: areaAr,
      },
      create: {
        propertyId: created.id,
        locale: LocaleCode.ar,
        title: titleAr,
        description: descriptionAr,
        areaLabel: areaAr,
      },
    });

    properties.push(created);

    const profile = pick(rand, amenityProfiles);
    const amenityIds = Array.from(
      new Set(
        profile
          .map((k) => amenityByKey.get(k))
          .filter((id): id is string => typeof id === 'string'),
      ),
    );

    if (amenityIds.length > 0) {
      await prisma.propertyAmenity.createMany({
        data: amenityIds.map((amenityId) => ({ propertyId: created.id, amenityId })),
        skipDuplicates: true,
      });
    }

    const plan = isAdminOwned
      ? full
      : vendor.planCode === 'FP_LIST'
        ? list
        : vendor.planCode === 'FP_SEMI'
          ? semi
          : full;

    await prisma.propertyServiceConfig.create({
      data: {
        propertyId: created.id,
        servicePlanId: plan.id,
        vendorAgreementId: isAdminOwned ? null : vendor.agreementId,
        cleaningRequired: null,
        linenChangeRequired: null,
        inspectionRequired: null,
        restockRequired: null,
        maintenanceIncluded: null,
        guestCleaningFee: null,
        linenFee: null,
        inspectionFee: null,
        restockFee: null,
        currency: 'AED',
      },
    });

    await prisma.cancellationPolicyConfig.create({
      data: {
        propertyId: created.id,
        version: `seed-v2-${i + 1}`,
        isActive: true,
        freeCancelBeforeHours: 72,
        partialRefundBeforeHours: 48,
        noRefundWithinHours: 24,
        penaltyValue: 20,
      },
    });

    await prisma.propertyAvailabilitySettings.create({
      data: {
        propertyId: created.id,
        defaultMinNights: Math.max(1, Math.min(4, created.basePrice > 200000 ? 2 : 1)),
        defaultMaxNights: null,
        advanceNoticeDays: 0,
        preparationDays: 0,
      },
    });

    const ownerBlockAStart = addDays(today, 8 + (i % 35));
    const ownerBlockBStart = addDays(today, 45 + (i % 30));
    const ownerBlocks = [
      ...Array.from({ length: 2 + Math.floor(rand() * 3) }, (_, day) =>
        addDays(ownerBlockAStart, day),
      ),
      ...Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, day) =>
        addDays(ownerBlockBStart, day),
      ),
    ];

    await prisma.propertyCalendarDay.createMany({
      data: ownerBlocks.map((date) => ({
        propertyId: created.id,
        date,
        status: CalendarDayStatus.BLOCKED,
        note: 'Owner use (seeded)',
      })),
      skipDuplicates: true,
    });

    if (!isAdminOwned) {
      const ownershipPdf = createSeedPdf('properties', `${slug}-ownership-proof`);

      const ownershipDoc = await prisma.propertyDocument.create({
        data: {
          propertyId: created.id,
          type: PropertyDocumentType.OWNERSHIP_PROOF,
          uploadedByUserId: vendor.userId,
          reviewedByAdminId:
            created.status === PropertyStatus.PUBLISHED ||
            created.status === PropertyStatus.APPROVED
              ? admin.id
              : null,
          storageKey: ownershipPdf.storageKey,
          originalName: ownershipPdf.originalName,
          mimeType: ownershipPdf.mimeType,
          url: null,
        },
        select: { id: true },
      });

      await prisma.propertyDocument.update({
        where: { id: ownershipDoc.id },
        data: {
          url: `/api/vendor/properties/${created.id}/documents/${ownershipDoc.id}/download`,
        },
      });

      if (rand() > 0.45) {
        const permitPdf = createSeedPdf('properties', `${slug}-holiday-home-permit`);
        const permit = await prisma.propertyDocument.create({
          data: {
            propertyId: created.id,
            type: PropertyDocumentType.HOLIDAY_HOME_PERMIT,
            uploadedByUserId: vendor.userId,
            reviewedByAdminId:
              created.status === PropertyStatus.PUBLISHED ? admin.id : null,
            storageKey: permitPdf.storageKey,
            originalName: permitPdf.originalName,
            mimeType: permitPdf.mimeType,
            url: null,
          },
          select: { id: true },
        });

        await prisma.propertyDocument.update({
          where: { id: permit.id },
          data: {
            url: `/api/vendor/properties/${created.id}/documents/${permit.id}/download`,
          },
        });
      }
    }

    if (
      created.status === PropertyStatus.APPROVED ||
      created.status === PropertyStatus.PUBLISHED ||
      created.status === PropertyStatus.CHANGES_REQUESTED ||
      created.status === PropertyStatus.REJECTED
    ) {
      const decision =
        created.status === PropertyStatus.CHANGES_REQUESTED
          ? PropertyReviewDecision.REQUEST_CHANGES
          : created.status === PropertyStatus.REJECTED
            ? PropertyReviewDecision.REJECT
            : PropertyReviewDecision.APPROVE;

      await prisma.propertyReview.create({
        data: {
          propertyId: created.id,
          adminId: admin.id,
          decision,
          notes:
            decision === PropertyReviewDecision.APPROVE
              ? 'Seeded admin approval.'
              : decision === PropertyReviewDecision.REQUEST_CHANGES
                ? 'Seeded request changes: improve staging photos and compliance labels.'
                : 'Seeded rejection example for moderation state coverage.',
        },
      });
    }
  }

  const activationProperty = properties.find(
    (property) =>
      property.status === PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT &&
      property.vendorId !== admin.id,
  );

  if (activationProperty) {
    await prisma.propertyActivationInvoice.create({
      data: {
        propertyId: activationProperty.id,
        vendorId: activationProperty.vendorId,
        amount: 25000,
        currency: 'AED',
        status: ActivationInvoiceStatus.PENDING,
        provider: PaymentProvider.MANUAL,
      },
    });

    await prisma.notificationEvent.create({
      data: {
        type: NotificationType.PROPERTY_APPROVED_ACTIVATION_REQUIRED,
        entityType: 'PROPERTY',
        entityId: activationProperty.id,
        recipientUserId: activationProperty.vendorId,
        payloadJson: JSON.stringify({
          propertyId: activationProperty.id,
          status: PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT,
          amount: 25000,
          currency: 'AED',
        }),
      },
    });
  }

  const bookableProperties = properties.filter(
    (p) =>
      p.status === PropertyStatus.PUBLISHED ||
      p.status === PropertyStatus.APPROVED,
  );

  const allBookings: SeedBooking[] = [];
  const completedBookings: SeedBooking[] = [];
  const upcomingBookings: SeedBooking[] = [];
  const confirmedBookings: SeedBooking[] = [];

  async function createSeedBooking(params: {
    property: SeedProperty;
    customerId: string;
    checkIn: Date;
    checkOut: Date;
    status: BookingStatus;
  }) {
    const nights = Math.max(
      1,
      Math.round((params.checkOut.getTime() - params.checkIn.getTime()) / ONE_DAY_MS),
    );
    const totalAmount = params.property.basePrice * nights + params.property.cleaningFee;

    const hold = await prisma.propertyHold.create({
      data: {
        propertyId: params.property.id,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        status: HoldStatus.ACTIVE,
        expiresAt: addHours(now, 4),
        createdById: params.customerId,
      },
      select: { id: true },
    });

    const booking = await prisma.booking.create({
      data: {
        customerId: params.customerId,
        propertyId: params.property.id,
        holdId: hold.id,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: clamp(1 + Math.floor(rand() * 4), 1, 6),
        children: Math.floor(rand() * 2),
        status: params.status,
        totalAmount,
        currency: 'AED',
        cancelledAt:
          params.status === BookingStatus.CANCELLED
            ? addHours(params.checkIn, -20)
            : null,
        cancelledBy:
          params.status === BookingStatus.CANCELLED
            ? CancellationActor.CUSTOMER
            : null,
        cancellationReason:
          params.status === BookingStatus.CANCELLED
            ? CancellationReason.GUEST_REQUEST
            : null,
        expiresAt:
          params.status === BookingStatus.PENDING_PAYMENT
            ? addHours(now, 24)
            : null,
      },
      select: {
        id: true,
        propertyId: true,
        customerId: true,
        status: true,
        checkIn: true,
        checkOut: true,
        totalAmount: true,
      },
    });

    await prisma.propertyHold.update({
      where: { id: hold.id },
      data: {
        status: HoldStatus.CONVERTED,
        bookingId: booking.id,
        convertedAt: now,
      },
    });

    const paymentStatus =
      params.status === BookingStatus.PENDING_PAYMENT
        ? PaymentStatus.REQUIRES_ACTION
        : PaymentStatus.CAPTURED;

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.MANUAL,
        status: paymentStatus,
        amount: totalAmount,
        currency: 'AED',
        providerRef: `seed_manual_${booking.id}`,
      },
      select: { id: true, providerRef: true },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        type:
          paymentStatus === PaymentStatus.CAPTURED
            ? PaymentEventType.CAPTURE
            : PaymentEventType.AUTHORIZE,
        providerRef: payment.providerRef,
        payloadJson: JSON.stringify({
          source: 'seed',
          bookingId: booking.id,
          paymentStatus,
        }),
      },
    });

    if (params.status === BookingStatus.CANCELLED) {
      const refundableAmount = Math.max(0, Math.round(totalAmount * 0.7));
      const penaltyAmount = totalAmount - refundableAmount;

      const refund = await prisma.refund.create({
        data: {
          bookingId: booking.id,
          paymentId: payment.id,
          status: RefundStatus.SUCCEEDED,
          reason: RefundReason.CANCELLATION,
          amount: refundableAmount,
          currency: 'AED',
          provider: PaymentProvider.MANUAL,
          providerRefundRef: `seed_refund_${booking.id}`,
          idempotencyKey: `seed_refund_${booking.id}`,
        },
        select: { id: true },
      });

      await prisma.bookingCancellation.create({
        data: {
          bookingId: booking.id,
          actor: CancellationActor.CUSTOMER,
          reason: CancellationReason.GUEST_REQUEST,
          mode: CancellationMode.SOFT,
          policyVersion: 'seed-policy-v1',
          cancelledAt: addHours(params.checkIn, -20),
          totalAmount,
          managementFee: 0,
          penaltyAmount,
          refundableAmount,
          currency: 'AED',
          releasesInventory: true,
          refundId: refund.id,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });

      await prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.REFUND,
          providerRef: `seed_refund_${booking.id}`,
          payloadJson: JSON.stringify({
            source: 'seed',
            bookingId: booking.id,
            refundStatus: RefundStatus.SUCCEEDED,
          }),
        },
      });
    }

    const seededBooking: SeedBooking = {
      id: booking.id,
      propertyId: booking.propertyId,
      customerId: booking.customerId,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalAmount: booking.totalAmount,
    };

    allBookings.push(seededBooking);

    if (seededBooking.status === BookingStatus.COMPLETED) {
      completedBookings.push(seededBooking);
    } else {
      upcomingBookings.push(seededBooking);
    }
    if (seededBooking.status === BookingStatus.CONFIRMED) {
      confirmedBookings.push(seededBooking);
    }

    return seededBooking;
  }

  const windowProperties =
    bookableProperties.length > 0
      ? bookableProperties
      : properties.slice(0, Math.min(8, properties.length));

  const windowCursor = new Map<string, Date>();
  windowProperties.forEach((property, index) => {
    windowCursor.set(property.id, addDays(BOOKING_WINDOW_START, index % 5));
  });

  const pastCursor = new Map<string, Date>();
  windowProperties.forEach((property, index) => {
    pastCursor.set(property.id, addDays(BOOKING_WINDOW_START, -(52 + index * 2)));
  });

  function reserveWindowSlot(
    property: SeedProperty,
    stayNights: number,
  ): { checkIn: Date; checkOut: Date } | null {
    const cursor = windowCursor.get(property.id) ?? BOOKING_WINDOW_START;
    const checkIn = new Date(cursor);
    const checkOut = addDays(checkIn, stayNights);
    if (checkOut > BOOKING_WINDOW_END) return null;
    windowCursor.set(property.id, new Date(checkOut));
    return { checkIn, checkOut };
  }

  function reservePastSlot(
    property: SeedProperty,
    stayNights: number,
  ): { checkIn: Date; checkOut: Date } | null {
    const cursor = pastCursor.get(property.id) ?? addDays(BOOKING_WINDOW_START, -60);
    const checkIn = new Date(cursor);
    const checkOut = addDays(checkIn, stayNights);
    if (checkOut >= BOOKING_WINDOW_START) return null;
    pastCursor.set(property.id, addDays(checkOut, 2));
    return { checkIn, checkOut };
  }

  async function seedWindowBookings(target: number, status: BookingStatus, propertyStep: number, customerStep: number) {
    let created = 0;
    let cursor = 0;
    let attempts = 0;
    while (created < target && attempts < target * 20) {
      attempts += 1;
      const property =
        windowProperties[(cursor * propertyStep + 1) % windowProperties.length] as SeedProperty;
      const customer = customers[(cursor * customerStep + 3) % customers.length] as { id: string };
      const stayNights = clamp(2 + Math.floor(rand() * 4), 2, 5);
      const slot = reserveWindowSlot(property, stayNights);
      cursor += 1;
      if (!slot) continue;
      await createSeedBooking({
        property,
        customerId: customer.id,
        checkIn: slot.checkIn,
        checkOut: slot.checkOut,
        status,
      });
      created += 1;
    }
  }

  for (let i = 0; i < TARGET_COUNTS.completedBookings; i++) {
    const property = windowProperties[i % windowProperties.length] as SeedProperty;
    const customer = customers[(i * 7 + 1) % customers.length] as { id: string };
    const stayNights = clamp(2 + Math.floor(rand() * 4), 2, 6);
    const slot = reservePastSlot(property, stayNights);
    if (!slot) continue;
    await createSeedBooking({
      property,
      customerId: customer.id,
      checkIn: slot.checkIn,
      checkOut: slot.checkOut,
      status: BookingStatus.COMPLETED,
    });
  }

  await seedWindowBookings(TARGET_COUNTS.confirmedBookings, BookingStatus.CONFIRMED, 3, 5);
  await seedWindowBookings(TARGET_COUNTS.pendingBookings, BookingStatus.PENDING_PAYMENT, 5, 7);
  await seedWindowBookings(TARGET_COUNTS.cancelledBookings, BookingStatus.CANCELLED, 7, 9);

  for (let i = 0; i < 4; i++) {
    const property = windowProperties[i % windowProperties.length] as SeedProperty;
    const customer = customers[(i * 3 + 2) % customers.length] as { id: string };
    const checkIn = addDays(BOOKING_WINDOW_START, 2 + i * 4);
    const checkOut = addDays(checkIn, 2);
    await prisma.propertyHold.create({
      data: {
        propertyId: property.id,
        checkIn,
        checkOut,
        status: HoldStatus.EXPIRED,
        expiresAt: addHours(checkIn, -6),
        createdById: customer.id,
      },
    });
  }

  const opsSourceBookings = confirmedBookings;
  for (const booking of opsSourceBookings) {
    const scheduled = addDays(booking.checkIn, -1);

    await prisma.opsTask.create({
      data: {
        propertyId: booking.propertyId,
        bookingId: booking.id,
        type: OpsTaskType.CLEANING,
        status: OpsTaskStatus.PENDING,
        scheduledFor: scheduled,
        dueAt: addHours(scheduled, 12),
        completedAt: null,
        notes: 'Seeded cleaning run for booking turnover.',
      },
    });

    await prisma.opsTask.create({
      data: {
        propertyId: booking.propertyId,
        bookingId: booking.id,
        type: OpsTaskType.INSPECTION,
        status: OpsTaskStatus.PENDING,
        scheduledFor: addHours(scheduled, 6),
        dueAt: addHours(scheduled, 20),
        completedAt: null,
        notes: 'Seeded inspection checkpoint for quality control.',
      },
    });
  }

  const bookingDocsTargets = [
    ...upcomingBookings.slice(0, 45),
    ...completedBookings.slice(0, 15),
  ];

  for (const booking of bookingDocsTargets) {
    const docTypes: BookingDocumentType[] = [
      BookingDocumentType.PASSPORT,
      BookingDocumentType.EMIRATES_ID,
      ...(rand() > 0.55 ? [BookingDocumentType.VISA] : []),
    ];

    for (const type of docTypes) {
      const pdf = createSeedPdf('bookings', `${booking.id}-${type.toLowerCase()}`);
      await prisma.bookingDocument.create({
        data: {
          bookingId: booking.id,
          uploadedByUserId: booking.customerId,
          type,
          storageKey: pdf.storageKey,
          originalName: pdf.originalName,
          mimeType: pdf.mimeType,
          notes: 'Seeded booking verification document.',
        },
      });
    }
  }

  const statementPeriodStart = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  const statementPeriodEnd = new Date(Date.UTC(2026, 1, 1, 0, 0, 0));
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  for (let i = 0; i < seededVendors.length; i++) {
    const vendor = seededVendors[i] as SeedVendor;
    const vendorCompleted = completedBookings.filter((booking) => {
      const property = propertyById.get(booking.propertyId);
      return property?.vendorId === vendor.userId;
    });

    const grossRaw = vendorCompleted.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const grossBookings = grossRaw > 0 ? grossRaw : 240000 + i * 25000;
    const managementFees = Math.round(grossBookings * (0.14 + i * 0.01));
    const refunds = i % 2 === 0 ? Math.round(grossBookings * 0.025) : 0;
    const adjustments = i === 2 ? -6500 : i === 3 ? 3200 : 0;
    const netPayable = Math.max(0, grossBookings - managementFees - refunds + adjustments);

    const statementStatusByIndex: VendorStatementStatus[] = [
      VendorStatementStatus.PAID,
      VendorStatementStatus.FINALIZED,
      VendorStatementStatus.FINALIZED,
      VendorStatementStatus.DRAFT,
    ];
    const statementStatus =
      statementStatusByIndex[i] ?? VendorStatementStatus.FINALIZED;

    const statement = await prisma.vendorStatement.create({
      data: {
        vendorId: vendor.userId,
        periodStart: statementPeriodStart,
        periodEnd: statementPeriodEnd,
        currency: 'AED',
        status: statementStatus,
        grossBookings,
        managementFees,
        refunds,
        adjustments,
        netPayable,
        generatedAt: addDays(BOOKING_WINDOW_START, -10 + i),
        finalizedAt:
          statementStatus === VendorStatementStatus.DRAFT
            ? null
            : addDays(BOOKING_WINDOW_START, -5 + i),
        paidAt:
          statementStatus === VendorStatementStatus.PAID
            ? addDays(BOOKING_WINDOW_START, -2 + i)
            : null,
        metaJson: JSON.stringify({
          seeded: true,
          vendor: vendor.email,
          month: '2026-01',
        }),
      },
      select: { id: true, status: true },
    });

    let payoutStatus: PayoutStatus | null = null;
    if (i === 0) payoutStatus = PayoutStatus.SUCCEEDED;
    if (i === 1) payoutStatus = PayoutStatus.PROCESSING;

    if (payoutStatus) {
      await prisma.payout.create({
        data: {
          vendorId: vendor.userId,
          statementId: statement.id,
          status: payoutStatus,
          amount: netPayable,
          currency: 'AED',
          provider: PaymentProvider.MANUAL,
          providerRef: `seed_payout_${i + 1}`,
          scheduledAt: addDays(BOOKING_WINDOW_START, -3 + i),
          processedAt:
            payoutStatus === PayoutStatus.SUCCEEDED
              ? addDays(BOOKING_WINDOW_START, -2 + i)
              : null,
          failedAt: null,
          failureReason: null,
        },
      });
    }

    const ledgerRows: Array<{
      type: LedgerEntryType;
      direction: LedgerDirection;
      amount: number;
      idempotencyKey: string;
    }> = [
      {
        type: LedgerEntryType.BOOKING_CAPTURED,
        direction: LedgerDirection.CREDIT,
        amount: grossBookings,
        idempotencyKey: `seed_stmt_${vendor.userId}_capture`,
      },
      {
        type: LedgerEntryType.MANAGEMENT_FEE,
        direction: LedgerDirection.DEBIT,
        amount: managementFees,
        idempotencyKey: `seed_stmt_${vendor.userId}_fee`,
      },
    ];

    if (refunds > 0) {
      ledgerRows.push({
        type: LedgerEntryType.REFUND,
        direction: LedgerDirection.DEBIT,
        amount: refunds,
        idempotencyKey: `seed_stmt_${vendor.userId}_refund`,
      });
    }

    if (adjustments !== 0) {
      ledgerRows.push({
        type: LedgerEntryType.ADJUSTMENT,
        direction:
          adjustments > 0 ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
        amount: Math.abs(adjustments),
        idempotencyKey: `seed_stmt_${vendor.userId}_adjustment`,
      });
    }

    if (payoutStatus === PayoutStatus.SUCCEEDED) {
      ledgerRows.push({
        type: LedgerEntryType.PAYOUT,
        direction: LedgerDirection.DEBIT,
        amount: netPayable,
        idempotencyKey: `seed_stmt_${vendor.userId}_payout`,
      });
    }

    for (let rowIndex = 0; rowIndex < ledgerRows.length; rowIndex++) {
      const row = ledgerRows[rowIndex] as {
        type: LedgerEntryType;
        direction: LedgerDirection;
        amount: number;
        idempotencyKey: string;
      };

      await prisma.ledgerEntry.create({
        data: {
          vendorId: vendor.userId,
          statementId: statement.id,
          type: row.type,
          direction: row.direction,
          amount: row.amount,
          currency: 'AED',
          occurredAt: addDays(BOOKING_WINDOW_START, -9 + rowIndex),
          idempotencyKey: row.idempotencyKey,
          metaJson: JSON.stringify({ seeded: true, statementId: statement.id }),
        },
      });
    }
  }

  const reviewableBookings = completedBookings.slice(0, 70);
  for (let i = 0; i < reviewableBookings.length; i++) {
    const booking = reviewableBookings[i] as SeedBooking;
    const moderationRoll = rand();

    const reviewStatus =
      moderationRoll < 0.74
        ? GuestReviewStatus.APPROVED
        : moderationRoll < 0.92
          ? GuestReviewStatus.PENDING
          : GuestReviewStatus.REJECTED;

    const rating = clamp(3 + Math.floor(rand() * 3), 1, 5);

    await prisma.guestReview.create({
      data: {
        propertyId: booking.propertyId,
        bookingId: booking.id,
        customerId: booking.customerId,
        rating,
        title: pick(rand, REVIEW_TITLES),
        comment: pick(rand, REVIEW_COMMENTS),
        status: reviewStatus,
        moderatedByAdminId:
          reviewStatus === GuestReviewStatus.PENDING ? null : admin.id,
        moderatedAt:
          reviewStatus === GuestReviewStatus.PENDING
            ? null
            : addDays(today, -Math.floor(rand() * 40)),
        moderationNotes:
          reviewStatus === GuestReviewStatus.REJECTED
            ? 'Seeded rejection note for moderation queue coverage.'
            : reviewStatus === GuestReviewStatus.APPROVED
              ? 'Approved: completed stay and policy compliant.'
              : null,
      },
    });
  }

  const vendorCounterparties = vendorUsers.map((v) => ({
    userId: v.id,
    role: MessageCounterpartyRole.VENDOR,
    subject: `Operations sync: ${v.fullName}`,
  }));

  const customerCounterparties = customers.slice(0, 20).map((c, index) => ({
    userId: c.id,
    role: MessageCounterpartyRole.CUSTOMER,
    subject: `Guest support ticket #${String(1000 + index)}`,
  }));

  const threads = [...vendorCounterparties, ...customerCounterparties];

  for (let i = 0; i < threads.length; i++) {
    const threadSeed = threads[i] as {
      userId: string;
      role: MessageCounterpartyRole;
      subject: string;
    };

    const thread = await prisma.messageThread.create({
      data: {
        adminId: admin.id,
        counterpartyUserId: threadSeed.userId,
        counterpartyRole: threadSeed.role,
        subject: threadSeed.subject,
      },
      select: { id: true },
    });

    const base = addDays(today, -(85 - i));
    const messages = [
      {
        senderId: threadSeed.userId,
        body:
          threadSeed.role === MessageCounterpartyRole.VENDOR
            ? 'Please confirm cleaning and linen schedule for the next check-ins.'
            : 'I uploaded my travel documents and need confirmation before arrival.',
      },
      {
        senderId: admin.id,
        body:
          threadSeed.role === MessageCounterpartyRole.VENDOR
            ? 'Received. Ops team is scheduled and dashboard tasks are updated.'
            : 'Documents received. Booking remains confirmed and verified from backend records.',
      },
      {
        senderId: threadSeed.userId,
        body:
          threadSeed.role === MessageCounterpartyRole.VENDOR
            ? 'Great, I will keep owner-use blocks updated as well.'
            : 'Thanks, appreciated. Looking forward to check-in.',
      },
    ];

    let lastMessageAt = base;
    let lastPreview = '';
    let lastSenderId = admin.id;

    for (let m = 0; m < messages.length; m++) {
      const msg = messages[m] as { senderId: string; body: string };
      const createdAt = addHours(base, m * 5);
      await prisma.message.create({
        data: {
          threadId: thread.id,
          senderId: msg.senderId,
          body: msg.body,
          createdAt,
        },
      });

      lastMessageAt = createdAt;
      lastPreview = msg.body;
      lastSenderId = msg.senderId;
    }

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt,
        lastMessagePreview: lastPreview.slice(0, 280),
        lastMessageSenderId: lastSenderId,
        adminLastReadAt: addHours(lastMessageAt, -1),
        counterpartyLastReadAt: lastMessageAt,
      },
    });
  }

  const publishedVendorProperties = properties.filter(
    (p) => p.status === PropertyStatus.PUBLISHED,
  );

  if (publishedVendorProperties.length >= 3) {
    const pending = publishedVendorProperties[0] as SeedProperty;
    const approved = publishedVendorProperties[1] as SeedProperty;
    const rejected = publishedVendorProperties[2] as SeedProperty;

    await prisma.propertyUnpublishRequest.create({
      data: {
        propertyId: pending.id,
        propertyTitleSnapshot: pending.title,
        propertyCitySnapshot: pending.city,
        requestedByVendorId: pending.vendorId,
        status: 'PENDING',
        reason: 'Owner intends to reserve this unit for extended family use.',
      },
    });

    await prisma.propertyUnpublishRequest.create({
      data: {
        propertyId: approved.id,
        propertyTitleSnapshot: approved.title,
        propertyCitySnapshot: approved.city,
        requestedByVendorId: approved.vendorId,
        status: 'APPROVED',
        reason: 'Seasonal owner occupancy request.',
        reviewedByAdminId: admin.id,
        reviewedAt: addDays(today, -3),
        adminNotes: 'Approved with owner-proof docs verified.',
      },
    });

    await prisma.property.update({
      where: { id: approved.id },
      data: { status: PropertyStatus.APPROVED },
    });

    await prisma.propertyUnpublishRequest.create({
      data: {
        propertyId: rejected.id,
        propertyTitleSnapshot: rejected.title,
        propertyCitySnapshot: rejected.city,
        requestedByVendorId: rejected.vendorId,
        status: 'REJECTED',
        reason: 'Requested temporary removal for pricing adjustment.',
        reviewedByAdminId: admin.id,
        reviewedAt: addDays(today, -1),
        adminNotes: 'Rejected until active booking window is complete.',
      },
    });
  }

  if (properties.length >= 2) {
    const deletionA = properties[0] as SeedProperty;
    const deletionB = properties[1] as SeedProperty;

    await prisma.propertyDeletionRequest.create({
      data: {
        propertyId: deletionA.id,
        propertyTitleSnapshot: deletionA.title,
        propertyCitySnapshot: deletionA.city,
        requestedByVendorId: deletionA.vendorId,
        status: 'PENDING',
        reason: 'Unit planned for long-term lease conversion.',
      },
    });

    await prisma.propertyDeletionRequest.create({
      data: {
        propertyId: deletionB.id,
        propertyTitleSnapshot: deletionB.title,
        propertyCitySnapshot: deletionB.city,
        requestedByVendorId: deletionB.vendorId,
        status: 'REJECTED',
        reason: 'Requested archival due to renovations.',
        reviewedByAdminId: admin.id,
        reviewedAt: addDays(today, -2),
        adminNotes: 'Rejected until pending guest stays complete.',
      },
    });
  }

  const yesterday = addDays(today, -1);
  const fxSnapshots = [
    {
      asOfDate: yesterday,
      sar: new Prisma.Decimal('1.0209'),
      usd: new Prisma.Decimal('0.2721'),
      eur: new Prisma.Decimal('0.2512'),
      gbp: new Prisma.Decimal('0.2147'),
    },
    {
      asOfDate: today,
      sar: new Prisma.Decimal('1.0221'),
      usd: new Prisma.Decimal('0.2726'),
      eur: new Prisma.Decimal('0.2520'),
      gbp: new Prisma.Decimal('0.2151'),
    },
  ];

  for (const snapshot of fxSnapshots) {
    const provider = 'seed:manual';

    await prisma.fxRate.upsert({
      where: {
        baseCurrency_quoteCurrency_asOfDate: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.SAR,
          asOfDate: snapshot.asOfDate,
        },
      },
      update: { rate: snapshot.sar, provider },
      create: {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.SAR,
        rate: snapshot.sar,
        asOfDate: snapshot.asOfDate,
        provider,
      },
    });

    await prisma.fxRate.upsert({
      where: {
        baseCurrency_quoteCurrency_asOfDate: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.USD,
          asOfDate: snapshot.asOfDate,
        },
      },
      update: { rate: snapshot.usd, provider },
      create: {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.USD,
        rate: snapshot.usd,
        asOfDate: snapshot.asOfDate,
        provider,
      },
    });

    await prisma.fxRate.upsert({
      where: {
        baseCurrency_quoteCurrency_asOfDate: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.EUR,
          asOfDate: snapshot.asOfDate,
        },
      },
      update: { rate: snapshot.eur, provider },
      create: {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.EUR,
        rate: snapshot.eur,
        asOfDate: snapshot.asOfDate,
        provider,
      },
    });

    await prisma.fxRate.upsert({
      where: {
        baseCurrency_quoteCurrency_asOfDate: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.GBP,
          asOfDate: snapshot.asOfDate,
        },
      },
      update: { rate: snapshot.gbp, provider },
      create: {
        baseCurrency: 'AED',
        quoteCurrency: FxQuoteCurrency.GBP,
        rate: snapshot.gbp,
        asOfDate: snapshot.asOfDate,
        provider,
      },
    });

    await prisma.fxSnapshot.createMany({
      data: [
        {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.SAR,
          rate: snapshot.sar,
          asOfDate: snapshot.asOfDate,
          provider,
        },
        {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.USD,
          rate: snapshot.usd,
          asOfDate: snapshot.asOfDate,
          provider,
        },
        {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.EUR,
          rate: snapshot.eur,
          asOfDate: snapshot.asOfDate,
          provider,
        },
        {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.GBP,
          rate: snapshot.gbp,
          asOfDate: snapshot.asOfDate,
          provider,
        },
      ],
    });
  }

  const seededStats = {
    users: await prisma.user.count(),
    vendors: await prisma.user.count({ where: { role: UserRole.VENDOR } }),
    customers: await prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
    properties: await prisma.property.count(),
    bookings: await prisma.booking.count(),
    bookingDocuments: await prisma.bookingDocument.count(),
    guestReviews: await prisma.guestReview.count(),
    messageThreads: await prisma.messageThread.count(),
    messages: await prisma.message.count(),
    fxRates: await prisma.fxRate.count(),
  };

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete (Dubai operations dataset)');
  // eslint-disable-next-line no-console
  console.log({
    password: SEED_PASSWORD,
    admin: admin.email,
    vendorSample: vendorUsers.slice(0, 5).map((v) => v.email),
    customerSample: customers.slice(0, 5).map((c) => c.email),
  });
  // eslint-disable-next-line no-console
  console.log(seededStats);
  // eslint-disable-next-line no-console
  console.table(
    properties.slice(0, 12).map((p) => ({
      slug: p.slug,
      status: p.status,
      city: p.city,
      area: p.area,
      nightlyAED: (p.basePrice / 100).toFixed(0),
    })),
  );
  // eslint-disable-next-line no-console
  console.log({
    seededFxAsOf: fxSnapshots.map((x) => toIsoDay(x.asOfDate)),
    privateUploadBases: PRIVATE_UPLOAD_BASES,
  });
}

async function runSeedWithRetry() {
  for (let attempt = 1; attempt <= SEED_RUN_MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        // eslint-disable-next-line no-console
        console.log(
          `[seed] Retrying full seed run (attempt ${attempt}/${SEED_RUN_MAX_ATTEMPTS})...`,
        );
      }

      await main();
      return;
    } catch (error: unknown) {
      const shouldRetry =
        hasPrismaCode(error, 'P1001') && attempt < SEED_RUN_MAX_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }

      // eslint-disable-next-line no-console
      console.warn(
        `[seed] Transient DB connectivity issue while seeding (attempt ${attempt}/${SEED_RUN_MAX_ATTEMPTS}): ${errorToMessage(error)}`,
      );
      await prisma.$disconnect().catch(() => undefined);
      await wait(SEED_RUN_RETRY_DELAY_MS);
    }
  }
}

runSeedWithRetry()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
