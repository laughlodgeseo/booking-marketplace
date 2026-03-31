/**
 * Phase 5 — Extended Demo Data
 *
 * Adds on top of the base demo seed:
 *  1. Historical COMPLETED bookings (Sep 2025 - Feb 2026, 6-month window)
 *  2. GuestReview records for every completed booking (with vendor responses on select ones)
 *  3. PricingRule records (weekend premium, seasonal, summer sale) for published properties
 *  4. MessageThread + Message conversations (customer-admin, vendor-admin)
 *  5. WishlistItem records for customers
 */

import { createHash } from 'crypto';
import {
  BookingStatus,
  CalendarDayStatus,
  GuestReviewStatus,
  HoldStatus,
  MessageCounterpartyRole,
  MessageTopic,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  PricingRuleType,
  PrismaClient,
} from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRef = { id: string; email: string };

type PublishedProperty = {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  cleaningFee: number;
  minNights: number;
  vendorId: string;
};

export type Phase5Context = {
  prisma: PrismaClient;
  adminUserId: string;
  customerByKey: Record<string, UserRef>;
  vendorByKey: Record<string, UserRef>;
  publishedProperties: PublishedProperty[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function toDate(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

function toIsoDay(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ─── 1. Historical Completed Bookings ────────────────────────────────────────

type HistoricalBookingPlan = {
  key: string;
  customerKey: string;
  propertySlug: string;
  checkInIso: string;
  checkOutIso: string;
};

const HISTORICAL_BOOKING_PLANS: HistoricalBookingPlan[] = [
  // Sep 2025
  { key: 'ayaan-downtown-h1', customerKey: 'customer.ayaan', propertySlug: 'demo-burj-vista-suite-downtown-dubai', checkInIso: '2025-09-05', checkOutIso: '2025-09-09' },
  { key: 'sara-jbr-h1', customerKey: 'customer.sara', propertySlug: 'demo-sea-breeze-flat-jbr', checkInIso: '2025-09-12', checkOutIso: '2025-09-16' },
  { key: 'omar-marina-h1', customerKey: 'customer.omar', propertySlug: 'demo-marina-horizon-apartment-dubai-marina', checkInIso: '2025-09-20', checkOutIso: '2025-09-24' },
  // Oct 2025
  { key: 'huda-palm-h1', customerKey: 'customer.huda', propertySlug: 'demo-palm-shore-retreat-palm-jumeirah', checkInIso: '2025-10-03', checkOutIso: '2025-10-08' },
  { key: 'zain-business-h1', customerKey: 'customer.zain', propertySlug: 'demo-canal-heights-residence-business-bay', checkInIso: '2025-10-14', checkOutIso: '2025-10-18' },
  { key: 'mariam-barsha-h1', customerKey: 'customer.mariam', propertySlug: 'demo-al-barsha-modern-stay-al-barsha', checkInIso: '2025-10-22', checkOutIso: '2025-10-26' },
  // Nov 2025
  { key: 'ibrahim-difc-h1', customerKey: 'customer.ibrahim', propertySlug: 'demo-difc-skyline-suite-difc', checkInIso: '2025-11-06', checkOutIso: '2025-11-09' },
  { key: 'ayaan-jlt-h1', customerKey: 'customer.ayaan', propertySlug: 'demo-jlt-lakeview-residence-jlt', checkInIso: '2025-11-14', checkOutIso: '2025-11-18' },
  { key: 'sara-citywalk-h1', customerKey: 'customer.sara', propertySlug: 'demo-city-walk-urban-home-city-walk', checkInIso: '2025-11-22', checkOutIso: '2025-11-26' },
  // Dec 2025 (peak season)
  { key: 'omar-downtown-h2', customerKey: 'customer.omar', propertySlug: 'demo-burj-vista-suite-downtown-dubai', checkInIso: '2025-12-05', checkOutIso: '2025-12-10' },
  { key: 'huda-creek-h1', customerKey: 'customer.huda', propertySlug: 'demo-creek-harbour-waterfront-home-creek-harbour', checkInIso: '2025-12-14', checkOutIso: '2025-12-19' },
  { key: 'zain-palm-h2', customerKey: 'customer.zain', propertySlug: 'demo-palm-shore-retreat-palm-jumeirah', checkInIso: '2025-12-26', checkOutIso: '2025-12-31' },
  // Jan 2026
  { key: 'mariam-business-h2', customerKey: 'customer.mariam', propertySlug: 'demo-canal-heights-residence-business-bay', checkInIso: '2026-01-06', checkOutIso: '2026-01-10' },
  { key: 'ibrahim-barsha-h2', customerKey: 'customer.ibrahim', propertySlug: 'demo-al-barsha-modern-stay-al-barsha', checkInIso: '2026-01-15', checkOutIso: '2026-01-19' },
  { key: 'ayaan-marina-h2', customerKey: 'customer.ayaan', propertySlug: 'demo-marina-horizon-apartment-dubai-marina', checkInIso: '2026-01-23', checkOutIso: '2026-01-27' },
  // Feb 2026 (up to Feb 21 to avoid demo booking window conflict)
  { key: 'sara-difc-h2', customerKey: 'customer.sara', propertySlug: 'demo-difc-skyline-suite-difc', checkInIso: '2026-02-04', checkOutIso: '2026-02-08' },
  { key: 'omar-creek-h2', customerKey: 'customer.omar', propertySlug: 'demo-creek-harbour-waterfront-home-creek-harbour', checkInIso: '2026-02-12', checkOutIso: '2026-02-16' },
];

// ─── 2. Review content ────────────────────────────────────────────────────────

type ReviewContent = {
  rating: number;
  cleanlinessRating: number;
  locationRating: number;
  communicationRating: number;
  valueRating: number;
  title: string;
  comment: string;
  hostResponse?: string;
};

const REVIEW_POOL: ReviewContent[] = [
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 5,
    title: 'Exceptional stay - exceeded expectations',
    comment: 'Everything was spotless on arrival. The views were incredible and the host team was super responsive throughout our stay. Highly recommend for anyone visiting Dubai.',
    hostResponse: 'Thank you for this wonderful review! We are delighted you enjoyed the views and our support. We look forward to welcoming you back soon.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 4, communicationRating: 5, valueRating: 4,
    title: 'Perfect for a business trip',
    comment: 'Arrived late and check-in was seamless. The apartment is very well-equipped - fast Wi-Fi, good workspace, and comfortable bed. Location is ideal for DIFC meetings.',
    hostResponse: 'Glad the check-in was smooth and the workspace met your needs. Safe travels on your next trip!',
  },
  {
    rating: 4, cleanlinessRating: 4, locationRating: 5, communicationRating: 4, valueRating: 4,
    title: 'Great location, good value',
    comment: 'The apartment is in a fantastic spot - walking distance to the beach and great restaurants nearby. Apartment was clean and well-maintained. Minor: the shower pressure could be better.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 5,
    title: 'Our favourite stay in Dubai!',
    comment: 'We have stayed in many holiday apartments in Dubai but this one stood out. Impeccably clean, gorgeous views, and the team was genuinely helpful when we needed local tips.',
    hostResponse: 'This really made our day! We love sharing local recommendations and are so pleased it made your trip special. Come back anytime!',
  },
  {
    rating: 3, cleanlinessRating: 3, locationRating: 4, communicationRating: 3, valueRating: 3,
    title: 'Average stay - could be better',
    comment: 'The apartment was okay but not up to the standard I expected at this price point. Some kitchen appliances were not working and it took a day to get a response. Location was good though.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 4,
    title: 'Amazing apartment - will be back!',
    comment: 'We had a family trip and the space was perfect. Kids loved the pool access and the apartment had everything we needed. Communication was quick and clear from the moment we booked.',
    hostResponse: 'So happy your family had a great time! The pool is always a hit with younger guests. We hope to see you all again!',
  },
  {
    rating: 4, cleanlinessRating: 5, locationRating: 4, communicationRating: 4, valueRating: 4,
    title: 'Well-managed and comfortable',
    comment: 'The property clearly has a professional management team - everything was in order, the welcome information was detailed, and any questions were answered quickly.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 5,
    title: 'Luxury at a fair price',
    comment: 'For what you get - the quality of furnishings, the stunning view, and the location - the price is genuinely competitive. I have stayed at 5-star hotels for more and got less.',
    hostResponse: 'That is high praise indeed! We work hard to deliver genuine value and it means a lot to hear it from guests like you.',
  },
  {
    rating: 4, cleanlinessRating: 4, locationRating: 5, communicationRating: 5, valueRating: 4,
    title: 'Great stay, loved the neighbourhood',
    comment: 'The area itself was as much a highlight as the apartment. Excellent cafes and restaurants a short walk away. The apartment was comfortable and the host was very responsive.',
  },
  {
    rating: 2, cleanlinessRating: 2, locationRating: 4, communicationRating: 2, valueRating: 2,
    title: 'Disappointing - not as described',
    comment: 'The photos were more flattering than reality. Apartment had signs of wear, one of the bedroom ACs was not working properly, and it took multiple messages to get basic assistance. Would not rebook.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 5,
    title: 'Perfect New Year break',
    comment: 'We rang in the new year from the balcony watching fireworks. Apartment was pristine, beds were comfortable, and the check-out process was hassle-free. 10/10.',
    hostResponse: 'What an amazing way to celebrate the new year! Thank you for choosing us and for this glowing review. We would love to host you again.',
  },
  {
    rating: 4, cleanlinessRating: 4, locationRating: 4, communicationRating: 4, valueRating: 4,
    title: 'Solid choice for a Dubai visit',
    comment: 'Reliable, clean, and well-located. Nothing blew me away but nothing disappointed either. Good value for the area and the booking process was smooth.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 4, communicationRating: 5, valueRating: 5,
    title: 'Brilliant host team',
    comment: 'The team went above and beyond. They arranged a late check-out for us at no extra charge, kept the apartment stocked with essentials, and were always reachable. Would recommend to anyone.',
    hostResponse: 'We are so glad we could accommodate your schedule! Taking care of guests is what we love doing. See you on your next visit!',
  },
  {
    rating: 3, cleanlinessRating: 4, locationRating: 5, communicationRating: 3, valueRating: 3,
    title: 'Location great, management needs work',
    comment: 'The apartment position is unbeatable but the management process felt a bit disorganised - check-in instructions arrived late and a few things were not ready on arrival. Good bones, needs polish.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 4,
    title: 'Exceeded every expectation',
    comment: 'From booking to check-out this was a faultless experience. The apartment is beautifully presented, the host was warm and professional, and I left feeling genuinely looked after.',
  },
  {
    rating: 4, cleanlinessRating: 4, locationRating: 5, communicationRating: 5, valueRating: 4,
    title: 'Lovely February getaway',
    comment: 'Dubai in February is perfect and this apartment made it even better. Very clean, well equipped, and the communication was excellent. Would happily stay again.',
  },
  {
    rating: 5, cleanlinessRating: 5, locationRating: 5, communicationRating: 5, valueRating: 5,
    title: 'Five stars across the board',
    comment: 'I travel frequently for work and this is now my go-to in Dubai. The apartment ticks every box: location, cleanliness, amenities, and service.',
    hostResponse: 'Having frequent travellers choose us as their base in Dubai is exactly what we aim for. Thank you and see you on your next trip!',
  },
];

// ─── 3. Pricing Rule Plans ────────────────────────────────────────────────────

type PricingRulePlan = {
  key: string;
  type: PricingRuleType;
  name: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  fixedPrice?: number;
  priority: number;
};

const PRICING_RULE_PLANS: PricingRulePlan[] = [
  // Weekend premium for all published properties
  { key: 'weekend-premium', type: PricingRuleType.WEEKEND, name: 'Weekend Premium (+20%)', startDate: '2025-09-01', endDate: '2026-12-31', priceMultiplier: 1.2, priority: 10 },
  // Dubai peak season (Dec-Jan)
  { key: 'peak-season-dec-jan', type: PricingRuleType.SEASONAL, name: 'Peak Season Dec-Jan (+35%)', startDate: '2025-12-01', endDate: '2026-01-10', priceMultiplier: 1.35, priority: 20 },
  // Summer discount (Jul-Aug)
  { key: 'summer-promo', type: PricingRuleType.SEASONAL, name: 'Summer Promo (-15%)', startDate: '2026-07-01', endDate: '2026-08-31', priceMultiplier: 0.85, priority: 10 },
  // Eid holiday premium
  { key: 'eid-premium-2026', type: PricingRuleType.HOLIDAY, name: 'Eid Al Fitr Premium (+25%)', startDate: '2026-03-29', endDate: '2026-04-04', priceMultiplier: 1.25, priority: 30 },
];

// ─── 4. Messaging Plans ───────────────────────────────────────────────────────

type MessagePlan = {
  threadKey: string;
  counterpartyKey: string;
  counterpartyRole: MessageCounterpartyRole;
  topic: MessageTopic;
  subject: string;
  messages: Array<{ senderKey: string; body: string; offsetHours: number }>;
};

const MESSAGE_PLANS: MessagePlan[] = [
  {
    threadKey: 'thread-ayaan-admin',
    counterpartyKey: 'customer.ayaan',
    counterpartyRole: MessageCounterpartyRole.CUSTOMER,
    topic: MessageTopic.CHECKIN_ACCESS,
    subject: 'Early check-in request',
    messages: [
      { senderKey: 'customer.ayaan', body: 'Hi, we arrive at 10am on check-in day. Is early check-in possible? Happy to pay extra.', offsetHours: 0 },
      { senderKey: 'admin', body: 'Hi Ayaan! We can accommodate a 12pm early check-in at no extra charge. The unit will be ready. See you soon!', offsetHours: 2 },
      { senderKey: 'customer.ayaan', body: 'That is perfect, thank you so much! Really looking forward to the stay.', offsetHours: 3 },
    ],
  },
  {
    threadKey: 'thread-sara-admin',
    counterpartyKey: 'customer.sara',
    counterpartyRole: MessageCounterpartyRole.CUSTOMER,
    topic: MessageTopic.BOOKING_ISSUE,
    subject: 'Booking query - extra guests',
    messages: [
      { senderKey: 'customer.sara', body: 'Hello! We have booked for 2 but may have a friend joining for one night. Is this okay?', offsetHours: 0 },
      { senderKey: 'admin', body: 'Hi Sara, the property allows up to 4 guests so a third person is absolutely fine at no extra cost. Enjoy your stay!', offsetHours: 1 },
      { senderKey: 'customer.sara', body: 'Wonderful, thank you for the quick reply!', offsetHours: 1.5 },
    ],
  },
  {
    threadKey: 'thread-omar-admin',
    counterpartyKey: 'customer.omar',
    counterpartyRole: MessageCounterpartyRole.CUSTOMER,
    topic: MessageTopic.MAINTENANCE,
    subject: 'AC issue during stay',
    messages: [
      { senderKey: 'customer.omar', body: 'Hi - the AC in the main bedroom is not cooling properly. It is running but room stays warm. Can someone look at it?', offsetHours: 0 },
      { senderKey: 'admin', body: 'Hi Omar, really sorry to hear that. Our maintenance team will visit within the next 2 hours. Thank you for letting us know promptly.', offsetHours: 1 },
      { senderKey: 'admin', body: 'Update: the technician confirmed a refrigerant top-up was needed. AC should now be fully operational. Please let us know if the problem persists.', offsetHours: 4 },
      { senderKey: 'customer.omar', body: 'Yes it is working great now, thank you for the fast response!', offsetHours: 5 },
    ],
  },
  {
    threadKey: 'thread-vendor-oasis-admin',
    counterpartyKey: 'vendor.oasis',
    counterpartyRole: MessageCounterpartyRole.VENDOR,
    topic: MessageTopic.OTHER,
    subject: 'Listing review timeline',
    messages: [
      { senderKey: 'vendor.oasis', body: 'Hi admin team, I have submitted two new properties for review. Can you give me an idea of the expected turnaround time?', offsetHours: 0 },
      { senderKey: 'admin', body: 'Hi! Our current review queue is 2-3 business days. You will receive an email once the review is complete. Both submissions look well-prepared.', offsetHours: 6 },
      { senderKey: 'vendor.oasis', body: 'Great, thanks for the update. Let me know if you need anything else from my side.', offsetHours: 7 },
    ],
  },
  {
    threadKey: 'thread-vendor-marina-admin',
    counterpartyKey: 'vendor.marina',
    counterpartyRole: MessageCounterpartyRole.VENDOR,
    topic: MessageTopic.PAYMENT_REFUND,
    subject: 'Payout schedule question',
    messages: [
      { senderKey: 'vendor.marina', body: 'Hello, I wanted to ask about the payout schedule. When are completed booking payouts processed?', offsetHours: 0 },
      { senderKey: 'admin', body: 'Hi! Payouts are processed within 3 business days of the guest check-out date, minus the management fee per your agreed service plan.', offsetHours: 3 },
      { senderKey: 'vendor.marina', body: 'Understood, thanks for clarifying. The dashboard is really helpful for tracking this.', offsetHours: 5 },
    ],
  },
  {
    threadKey: 'thread-huda-admin',
    counterpartyKey: 'customer.huda',
    counterpartyRole: MessageCounterpartyRole.CUSTOMER,
    topic: MessageTopic.CHECKIN_ACCESS,
    subject: 'Key collection instructions',
    messages: [
      { senderKey: 'customer.huda', body: 'Hi, could you send me the check-in instructions? I did not receive anything by email after booking.', offsetHours: 0 },
      { senderKey: 'admin', body: 'Hi Huda! Apologies - it looks like the confirmation email ended up in spam. I am resending it now. The code for the key box is 4821. Call us if you have any issues.', offsetHours: 2 },
      { senderKey: 'customer.huda', body: 'Thank you! Found it in spam, all good now.', offsetHours: 2.5 },
    ],
  },
  {
    threadKey: 'thread-vendor-palm-admin',
    counterpartyKey: 'vendor.palm',
    counterpartyRole: MessageCounterpartyRole.VENDOR,
    topic: MessageTopic.CLEANING,
    subject: 'Cleaning schedule after long booking',
    messages: [
      { senderKey: 'vendor.palm', body: 'We have a 7-night booking ending on March 16. Can the platform arrange a mid-stay linen change on day 4?', offsetHours: 0 },
      { senderKey: 'admin', body: 'Absolutely, mid-stay services can be arranged for your fully-managed properties. I will add a linen change task to the ops schedule for March 20. Confirm OK?', offsetHours: 4 },
      { senderKey: 'vendor.palm', body: 'Perfect, confirmed. Thank you.', offsetHours: 5 },
    ],
  },
];

// ─── 5. Wishlist Plans ────────────────────────────────────────────────────────

const WISHLIST_PLANS: Array<{ customerKey: string; propertySlugs: string[] }> = [
  { customerKey: 'customer.ayaan', propertySlugs: ['demo-palm-shore-retreat-palm-jumeirah', 'demo-difc-skyline-suite-difc', 'demo-creek-harbour-waterfront-home-creek-harbour'] },
  { customerKey: 'customer.sara', propertySlugs: ['demo-burj-vista-suite-downtown-dubai', 'demo-marina-horizon-apartment-dubai-marina'] },
  { customerKey: 'customer.omar', propertySlugs: ['demo-city-walk-urban-home-city-walk', 'demo-palm-shore-retreat-palm-jumeirah', 'demo-al-barsha-modern-stay-al-barsha'] },
  { customerKey: 'customer.mariam', propertySlugs: ['demo-sea-breeze-flat-jbr', 'demo-jlt-lakeview-residence-jlt'] },
  { customerKey: 'customer.zain', propertySlugs: ['demo-burj-vista-suite-downtown-dubai', 'demo-creek-harbour-waterfront-home-creek-harbour'] },
];

// ─── Phase 5 Seeder ───────────────────────────────────────────────────────────

export async function seedPhase5Extras(context: Phase5Context): Promise<void> {
  const { prisma, adminUserId, customerByKey, vendorByKey, publishedProperties } = context;

  const propertyBySlug = new Map(publishedProperties.map((p) => [p.slug, p]));

  // ── 1. Historical completed bookings ────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[phase5] Seeding historical completed bookings...');

  const completedBookingByKey = new Map<string, { id: string; propertyId: string; customerId: string; completedAt: Date }>();

  for (const plan of HISTORICAL_BOOKING_PLANS) {
    const customer = customerByKey[plan.customerKey];
    if (!customer) throw new Error(`[phase5] Customer missing: ${plan.customerKey}`);

    const property = propertyBySlug.get(plan.propertySlug);
    if (!property) throw new Error(`[phase5] Property missing: ${plan.propertySlug}`);

    const checkIn = toDate(plan.checkInIso);
    const checkOut = toDate(plan.checkOutIso);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000));
    const totalAmount = property.basePrice * nights + property.cleaningFee;
    const createdAt = addDays(checkIn, -10);
    const completedAt = addDays(checkOut, 1);

    const holdId = stableUuid(`phase5-hold:${plan.key}`);
    const bookingId = stableUuid(`phase5-booking:${plan.key}`);
    const paymentId = stableUuid(`phase5-payment:${plan.key}`);

    await prisma.propertyHold.create({
      data: {
        id: holdId,
        propertyId: property.id,
        checkIn,
        checkOut,
        status: HoldStatus.CONVERTED,
        expiresAt: addHours(createdAt, 6),
        createdById: customer.id,
        createdAt,
        convertedAt: addHours(createdAt, 1),
      },
    });

    await prisma.booking.create({
      data: {
        id: bookingId,
        customerId: customer.id,
        propertyId: property.id,
        holdId,
        checkIn,
        checkOut,
        adults: 2,
        children: 0,
        status: BookingStatus.COMPLETED,
        totalAmount,
        currency: 'AED',
        totalAmountAed: totalAmount,
        displayTotalAmount: totalAmount,
        displayCurrency: 'AED',
        fxRate: 1,
        fxAsOfDate: createdAt,
        fxProvider: 'manual-demo',
        idempotencyKey: `phase5-idempotency-${plan.key}`,
        completedAt,
        createdAt,
      },
    });

    await prisma.payment.create({
      data: {
        id: paymentId,
        bookingId,
        provider: PaymentProvider.MANUAL,
        status: PaymentStatus.CAPTURED,
        amount: totalAmount,
        currency: 'AED',
        providerRef: `phase5-manual-${plan.key}`,
        createdAt: addHours(createdAt, 1),
      },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId,
        type: PaymentEventType.AUTHORIZE,
        idempotencyKey: `phase5-auth-${plan.key}`,
        providerRef: `phase5-auth-${plan.key}`,
        payloadJson: JSON.stringify({ stage: 'authorized', bookingId, source: 'phase5-seed' }),
        createdAt: addHours(createdAt, 2),
      },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId,
        type: PaymentEventType.CAPTURE,
        idempotencyKey: `phase5-capture-${plan.key}`,
        providerRef: `phase5-capture-${plan.key}`,
        payloadJson: JSON.stringify({ stage: 'captured', bookingId, source: 'phase5-seed' }),
        createdAt: addHours(createdAt, 3),
      },
    });

    // Block the calendar days for this booking
    const daySpan: string[] = [];
    let cursor = new Date(checkIn);
    while (cursor.getTime() < checkOut.getTime()) {
      daySpan.push(toIsoDay(cursor));
      cursor = addDays(cursor, 1);
    }
    await prisma.propertyCalendarDay.createMany({
      data: daySpan.map((date) => ({
        propertyId: property.id,
        date: toDate(date),
        status: CalendarDayStatus.BLOCKED,
        note: 'Completed booking block',
      })),
      skipDuplicates: true,
    });

    await prisma.notificationEvent.create({
      data: {
        type: NotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
        entityType: 'BOOKING',
        entityId: bookingId,
        recipientUserId: customer.id,
        payloadJson: JSON.stringify({ bookingId, source: 'phase5-seed' }),
        attempts: 1,
        nextAttemptAt: addHours(createdAt, 4),
        createdAt: addHours(createdAt, 4),
        sentAt: addHours(createdAt, 4),
      },
    });

    completedBookingByKey.set(plan.key, {
      id: bookingId,
      propertyId: property.id,
      customerId: customer.id,
      completedAt,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`[phase5] Seeded ${HISTORICAL_BOOKING_PLANS.length} completed bookings.`);

  // ── 2. Guest Reviews ────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[phase5] Seeding guest reviews...');

  let reviewIdx = 0;
  for (const [planKey, booking] of completedBookingByKey.entries()) {
    const content = REVIEW_POOL[reviewIdx % REVIEW_POOL.length];
    reviewIdx += 1;

    const reviewId = stableUuid(`phase5-review:${planKey}`);
    const reviewCreatedAt = addDays(booking.completedAt, 1 + (reviewIdx % 5));
    const isApproved = content.rating >= 3;

    await prisma.guestReview.create({
      data: {
        id: reviewId,
        propertyId: booking.propertyId,
        bookingId: booking.id,
        customerId: booking.customerId,
        rating: content.rating,
        cleanlinessRating: content.cleanlinessRating,
        locationRating: content.locationRating,
        communicationRating: content.communicationRating,
        valueRating: content.valueRating,
        title: content.title,
        comment: content.comment,
        status: isApproved ? GuestReviewStatus.APPROVED : GuestReviewStatus.PENDING,
        moderatedByAdminId: isApproved ? adminUserId : null,
        moderatedAt: isApproved ? addDays(reviewCreatedAt, 1) : null,
        moderationNotes: isApproved ? 'Auto-approved in demo seed.' : null,
        hostResponseText: content.hostResponse ?? null,
        hostResponseAt: content.hostResponse ? addDays(reviewCreatedAt, 2) : null,
        createdAt: reviewCreatedAt,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`[phase5] Seeded ${completedBookingByKey.size} guest reviews.`);

  // ── 3. Pricing Rules ────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[phase5] Seeding pricing rules...');

  let pricingRulesTotal = 0;
  for (const property of publishedProperties) {
    for (const rulePlan of PRICING_RULE_PLANS) {
      await prisma.pricingRule.create({
        data: {
          id: stableUuid(`phase5-pricing:${property.id}:${rulePlan.key}`),
          propertyId: property.id,
          type: rulePlan.type,
          name: rulePlan.name,
          startDate: toDate(rulePlan.startDate),
          endDate: toDate(rulePlan.endDate),
          priceMultiplier: rulePlan.priceMultiplier,
          fixedPrice: rulePlan.fixedPrice ?? null,
          priority: rulePlan.priority,
          isActive: true,
        },
      });
      pricingRulesTotal += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[phase5] Seeded ${pricingRulesTotal} pricing rules across ${publishedProperties.length} properties.`);

  // ── 4. Messaging ────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[phase5] Seeding message threads...');

  const allUsers: Record<string, UserRef> = {
    ...customerByKey,
    ...vendorByKey,
    admin: { id: adminUserId, email: 'admin@rentpropertyuae.com' },
  };
  const threadAnchor = new Date('2026-02-20T09:00:00.000Z');

  for (const plan of MESSAGE_PLANS) {
    const counterparty = allUsers[plan.counterpartyKey];
    if (!counterparty) {
      // eslint-disable-next-line no-console
      console.warn(`[phase5] Skipping thread ${plan.threadKey}: counterparty ${plan.counterpartyKey} not found`);
      continue;
    }

    const lastMsg = plan.messages[plan.messages.length - 1];
    const lastMsgAt = addHours(threadAnchor, lastMsg.offsetHours);
    const lastMsgSenderId = lastMsg.senderKey === 'admin' ? adminUserId : (allUsers[lastMsg.senderKey]?.id ?? adminUserId);

    const thread = await prisma.messageThread.upsert({
      where: { adminId_counterpartyUserId: { adminId: adminUserId, counterpartyUserId: counterparty.id } },
      update: {
        subject: plan.subject,
        topic: plan.topic,
        lastMessageAt: lastMsgAt,
        lastMessagePreview: lastMsg.body.slice(0, 120),
        lastMessageSenderId: lastMsgSenderId,
      },
      create: {
        adminId: adminUserId,
        counterpartyUserId: counterparty.id,
        counterpartyRole: plan.counterpartyRole,
        subject: plan.subject,
        topic: plan.topic,
        lastMessageAt: lastMsgAt,
        lastMessagePreview: lastMsg.body.slice(0, 120),
        lastMessageSenderId: lastMsgSenderId,
        adminLastReadAt: addHours(threadAnchor, lastMsg.offsetHours + 0.5),
        counterpartyLastReadAt: addHours(threadAnchor, lastMsg.offsetHours + 1),
        createdAt: threadAnchor,
      },
      select: { id: true },
    });

    for (const msg of plan.messages) {
      const senderId = msg.senderKey === 'admin' ? adminUserId : (allUsers[msg.senderKey]?.id ?? adminUserId);
      await prisma.message.create({
        data: {
          threadId: thread.id,
          senderId,
          body: msg.body,
          createdAt: addHours(threadAnchor, msg.offsetHours),
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[phase5] Seeded ${MESSAGE_PLANS.length} message threads.`);

  // ── 5. Wishlists ────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('[phase5] Seeding wishlist items...');

  let wishlistTotal = 0;
  for (const plan of WISHLIST_PLANS) {
    const customer = customerByKey[plan.customerKey];
    if (!customer) continue;

    for (const slug of plan.propertySlugs) {
      const property = propertyBySlug.get(slug);
      if (!property) continue;

      await prisma.wishlistItem.upsert({
        where: { userId_propertyId: { userId: customer.id, propertyId: property.id } },
        update: {},
        create: { userId: customer.id, propertyId: property.id },
      });
      wishlistTotal += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[phase5] Seeded ${wishlistTotal} wishlist items.`);

  // eslint-disable-next-line no-console
  console.log('[phase5] Phase 5 extras complete.');
}
