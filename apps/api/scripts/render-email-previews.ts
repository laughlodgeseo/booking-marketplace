import * as fs from 'fs';
import * as path from 'path';
import { renderNotificationEmail } from '../src/modules/notifications/email-renderer';

const outDir = path.join(process.cwd(), 'tmp', 'email-previews');

process.env.APP_ORIGIN ||= 'https://www.rentpropertyuae.com';
process.env.EMAIL_BRAND_LOGO_URL ||=
  'https://www.rentpropertyuae.com/brand/logo.svg';

const samples: Array<{ type: string; payload: Record<string, unknown> }> = [
  { type: 'EMAIL_VERIFICATION_OTP', payload: { otp: '123456', ttlMinutes: 10 } },
  {
    type: 'PASSWORD_RESET_REQUESTED',
    payload: {
      resetUrl: 'https://www.laughandlodge.com/reset-password?token=preview',
      ttlMinutes: 30,
    },
  },
  {
    type: 'BOOKING_CONFIRMED',
    payload: {
      booking: {
        id: 'booking_preview',
        propertyTitle: 'Palm Jumeirah Suite',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
        adults: 2,
        children: 1,
        totalAmount: 2100,
        currency: 'AED',
        status: 'CONFIRMED',
      },
    },
  },
  {
    type: 'PAYMENT_PENDING',
    payload: {
      booking: {
        id: 'booking_preview',
        propertyTitle: 'Palm Jumeirah Suite',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
      },
      payment: { amount: 8000, currency: 'AED' },
    },
  },
  {
    type: 'BOOKING_CANCELLED_BY_GUEST',
    payload: {
      booking: {
        id: 'booking_preview',
        propertyTitle: 'Palm Jumeirah Suite',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
        currency: 'AED',
        status: 'CANCELLED',
      },
      cancellation: {
        reason: 'CUSTOMER_REQUEST',
        penaltyAmount: 100,
        refundableAmount: 2000,
      },
    },
  },
  {
    type: 'DOCUMENT_UPLOAD_REQUEST',
    payload: {
      booking: {
        id: 'booking_preview',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
      },
      documents: {
        missingTypes: ['PASSPORT', 'EMIRATES_ID'],
        deadline: '2026-06-10T12:00:00.000Z',
      },
    },
  },
  {
    type: 'REFUND_PROCESSED',
    payload: {
      refund: {
        id: 'refund_preview_reference',
        bookingId: 'booking_preview',
        amount: 2000,
        currency: 'AED',
        status: 'SUCCEEDED',
      },
    },
  },
  {
    type: 'NEW_BOOKING_RECEIVED',
    payload: {
      booking: {
        id: 'booking_preview',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
        status: 'CONFIRMED',
      },
      property: { title: 'Marina Residence' },
      payout: {
        amount: 172200,
        currency: 'AED',
        expectedTiming: 'within 2 business days',
        methodMessage: 'Please add your payout details.',
      },
    },
  },
  {
    type: 'PROPERTY_APPROVED_ACTIVATION_REQUIRED',
    payload: {
      title: 'Downtown Residence',
      city: 'Dubai',
      activationFeeFormatted: 'AED 2100.00',
      insuranceFeeFormatted: 'AED 8000.00',
      totalFormatted: 'AED 10100.00',
    },
  },
  {
    type: 'VENDOR_PAYOUT_PAID',
    payload: {
      payout: {
        id: 'payout_preview_reference',
        amount: 172200,
        currency: 'AED',
        paidAt: '2026-06-14T08:00:00.000Z',
      },
      property: { title: 'Marina Residence' },
      booking: { id: 'booking_preview' },
    },
  },
  {
    type: 'OPS_TASKS_CREATED',
    payload: {
      bookingId: 'booking_preview',
      types: 'CHECK_IN_PREP, CLEANING',
      scheduledFor: '2026-06-12T09:00:00.000Z',
    },
  },
  {
    type: 'MAINTENANCE_REQUEST_CREATED',
    payload: {
      title: 'Vendor block request submitted',
      blockRequest: {
        id: 'block_preview_reference',
        propertyTitle: 'Downtown Residence',
        startDate: '2026-06-12',
        endDate: '2026-06-16',
        status: 'PENDING',
      },
    },
  },
];

fs.mkdirSync(outDir, { recursive: true });

for (const sample of samples) {
  const rendered = renderNotificationEmail(sample.type, sample.payload);
  const name = sample.type.toLowerCase().replace(/_/g, '-');
  fs.writeFileSync(path.join(outDir, `${name}.html`), rendered.html, 'utf8');
  fs.writeFileSync(path.join(outDir, `${name}.txt`), rendered.text, 'utf8');
}

console.log(`Rendered ${samples.length} email previews to ${outDir}`);
