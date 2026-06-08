import {
  EMAIL_ROUTE_AUDIT,
  formatEmailDate,
  formatEmailMoney,
  renderNotificationEmail,
} from './email-renderer';

const ENV_KEYS = [
  'APP_ORIGIN',
  'FRONTEND_URL',
  'WEB_APP_URL',
  'WEB_BASE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'EMAIL_BRAND_LOGO_URL',
  'BRAND_LOGO_URL',
] as const;

const RAW_ENUMS = [
  'PENDING_PAYMENT',
  'PROPERTY_APPROVED_ACTIVATION_REQUIRED',
  'PAID_AWAITING_VENDOR_CONFIRMATION',
  'READY_FOR_PAYOUT',
  'BOOKING_CANCELLED_BY_GUEST',
  'EMAIL_VERIFICATION_OTP',
  'checkInWindowStart',
  'bookingId',
  'propertyId',
  'paymentIntent',
];

describe('transactional email renderer', () => {
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('renders OTP with a premium code card, text fallback, and no broken logo image', () => {
    const email = renderNotificationEmail('EMAIL_VERIFICATION_OTP', {
      otp: '123456',
      ttlMinutes: 10,
    });

    expect(email.subject).toBe('Your Laugh & Lodge verification code');
    expect(email.html).toContain('Laugh &amp; Lodge');
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('123456');
    expect(email.text).toContain('Code: 123456');
    expect(email.text).toContain('expires in 10 minutes');
  });

  it('uses EMAIL_BRAND_LOGO_URL only when it is an absolute HTTPS URL', () => {
    process.env.EMAIL_BRAND_LOGO_URL = 'https://cdn.example.com/laugh-logo.png';
    const withLogo = renderNotificationEmail('EMAIL_VERIFICATION_OTP', {
      otp: '654321',
    });
    expect(withLogo.html).toContain(
      'src="https://cdn.example.com/laugh-logo.png"',
    );
    expect(withLogo.html).toContain('alt="Laugh &amp; Lodge"');

    process.env.EMAIL_BRAND_LOGO_URL = 'http://cdn.example.com/laugh-logo.png';
    const withoutLogo = renderNotificationEmail('EMAIL_VERIFICATION_OTP', {
      otp: '654321',
    });
    expect(withoutLogo.html).not.toContain('<img');
  });

  it('formats money with currency and thousands separators', () => {
    expect(formatEmailMoney(2100, 'AED')).toBe('AED 2,100.00');
    expect(formatEmailMoney('AED 8000.00')).toBe('AED 8,000.00');
  });

  it('formats dates in a human-readable style', () => {
    expect(formatEmailDate('2026-06-12T10:00:00.000Z')).toContain('June 2026');
    expect(formatEmailDate('2026-06-12T10:00:00.000Z')).not.toContain('T10:00');
  });

  it('renders safe absolute CTA URLs only when a frontend base URL exists', () => {
    const missingBase = renderNotificationEmail('BOOKING_CONFIRMED', {
      booking: {
        id: 'book_123',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
        totalAmount: 2100,
        currency: 'AED',
        status: 'CONFIRMED',
      },
    });

    expect(missingBase.html).not.toContain('/account/bookings/book_123');
    expect(missingBase.text).toContain('Sign in to your dashboard');

    process.env.APP_ORIGIN = 'https://www.laughandlodge.com';
    const withBase = renderNotificationEmail('BOOKING_CONFIRMED', {
      booking: {
        id: 'book_123',
        checkIn: '2026-06-12T00:00:00.000Z',
        checkOut: '2026-06-16T00:00:00.000Z',
        totalAmount: 2100,
        currency: 'AED',
        status: 'CONFIRMED',
      },
    });

    expect(withBase.html).toContain(
      'href="https://www.laughandlodge.com/account/bookings/book_123"',
    );
    expect(withBase.text).toContain(
      'View booking: https://www.laughandlodge.com/account/bookings/book_123',
    );
  });

  it('suppresses password reset buttons for unsafe or wrong-route reset URLs', () => {
    const email = renderNotificationEmail('PASSWORD_RESET_REQUESTED', {
      resetUrl: 'https://www.laughandlodge.com/not-reset?token=abc',
      ttlMinutes: 30,
    });

    expect(email.html).not.toContain('Reset password</a>');
    expect(email.text).toContain('request a new reset link');
  });

  it('renders major customer, vendor, and admin-facing templates without raw enum labels', () => {
    process.env.APP_ORIGIN = 'https://www.laughandlodge.com';
    const cases = [
      renderNotificationEmail('BOOKING_CONFIRMED', {
        booking: {
          id: 'booking_abc123',
          propertyTitle: 'Palm Jumeirah Suite',
          checkIn: '2026-06-12T00:00:00.000Z',
          checkOut: '2026-06-16T00:00:00.000Z',
          adults: 2,
          children: 1,
          totalAmount: 2100,
          currency: 'AED',
          status: 'CONFIRMED',
        },
      }),
      renderNotificationEmail('PAYMENT_PENDING', {
        booking: {
          id: 'booking_abc123',
          propertyTitle: 'Palm Jumeirah Suite',
          checkIn: '2026-06-12T00:00:00.000Z',
          checkOut: '2026-06-16T00:00:00.000Z',
        },
        payment: { amount: 8000, currency: 'AED' },
      }),
      renderNotificationEmail('BOOKING_CANCELLED_BY_GUEST', {
        booking: {
          id: 'booking_abc123',
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
      }),
      renderNotificationEmail('REFUND_PROCESSED', {
        refund: {
          id: 'refund_verylongreference',
          bookingId: 'booking_abc123',
          amount: 2000,
          currency: 'AED',
          status: 'SUCCEEDED',
        },
      }),
      renderNotificationEmail('DOCUMENT_UPLOAD_REQUEST', {
        booking: {
          id: 'booking_abc123',
          checkIn: '2026-06-12T00:00:00.000Z',
          checkOut: '2026-06-16T00:00:00.000Z',
        },
        documents: {
          missingTypes: ['PASSPORT', 'EMIRATES_ID'],
          deadline: '2026-06-10T12:00:00.000Z',
        },
      }),
      renderNotificationEmail('NEW_BOOKING_RECEIVED', {
        booking: {
          id: 'booking_abc123',
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
      }),
      renderNotificationEmail('VENDOR_PAYOUT_PAID', {
        payout: {
          id: 'payout_verylongreference',
          amount: 172200,
          currency: 'AED',
          paidAt: '2026-06-14T08:00:00.000Z',
        },
        property: { title: 'Marina Residence' },
        booking: { id: 'booking_abc123' },
      }),
      renderNotificationEmail('PROPERTY_APPROVED_ACTIVATION_REQUIRED', {
        title: 'Downtown Residence',
        city: 'Dubai',
        activationFeeFormatted: 'AED 2100.00',
        insuranceFeeFormatted: 'AED 8000.00',
        furnishingFeeFormatted: null,
        totalFormatted: 'AED 10100.00',
        actionUrl: 'https://broken.example.com/fake',
      }),
      renderNotificationEmail('OPS_TASKS_CREATED', {
        bookingId: 'booking_abc123',
        types: 'CHECK_IN_PREP, CLEANING',
        scheduledFor: '2026-06-12T09:00:00.000Z',
      }),
      renderNotificationEmail('MAINTENANCE_REQUEST_CREATED', {
        title: 'Vendor block request submitted',
        blockRequest: {
          id: 'block_verylongreference',
          propertyTitle: 'Downtown Residence',
          startDate: '2026-06-12',
          endDate: '2026-06-16',
          status: 'PENDING',
        },
      }),
    ];

    for (const email of cases) {
      expect(email.html).toContain('Laugh &amp; Lodge');
      expect(email.text.length).toBeGreaterThan(40);
      for (const raw of RAW_ENUMS) {
        expect(email.html).not.toContain(raw);
        expect(email.text).not.toContain(raw);
      }
    }
  });

  it('documents only route-backed CTAs in the route audit map', () => {
    expect(EMAIL_ROUTE_AUDIT.length).toBeGreaterThan(8);
    for (const row of EMAIL_ROUTE_AUDIT) {
      expect(row.routeExists).toBe(true);
      expect(row.fallback).toBeTruthy();
    }
  });
});
