type JsonObject = Record<string, unknown>;

type EmailBrand = {
  name: string;
  legalName: string;
  domain: string;
  supportEmail: string;
  bookingEmail: string;
  phone: string;
  country: string;
  logoUrl: string | null;
};

type DetailRow = {
  label: string;
  value: string | null | undefined;
  strong?: boolean;
};

type Cta = {
  label: string;
  url: string;
};

type EmailModel = {
  preview: string;
  title: string;
  eyebrow?: string;
  intro: string;
  badge?: { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' };
  sections?: Array<{ title: string; rows: DetailRow[] }>;
  amountSummary?: { label: string; value: string; note?: string };
  cta?: Cta | null;
  fallbackText?: string;
  notice?: string;
  securityNote?: string;
};

export type RenderedNotificationEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailRouteAuditRow = {
  emailName: string;
  ctaLabel: string;
  intendedRoute: string;
  routeExists: boolean;
  finalUrlBuilder: string;
  fallback: string;
};

export const EMAIL_ROUTE_AUDIT: EmailRouteAuditRow[] = [
  {
    emailName: 'Password reset',
    ctaLabel: 'Reset password',
    intendedRoute: '/reset-password?token=...',
    routeExists: true,
    finalUrlBuilder: 'validated absolute resetUrl payload',
    fallback: 'No button is rendered if the URL is missing or not /reset-password.',
  },
  {
    emailName: 'Booking confirmation',
    ctaLabel: 'View booking',
    intendedRoute: '/account/bookings/[bookingId]',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/account/bookings/{bookingId})',
    fallback: 'Ask the customer to sign in to their dashboard.',
  },
  {
    emailName: 'Booking cancellation',
    ctaLabel: 'Review booking',
    intendedRoute: '/account/bookings/[bookingId]',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/account/bookings/{bookingId})',
    fallback: 'Ask the recipient to sign in to their dashboard.',
  },
  {
    emailName: 'Payment pending / failed',
    ctaLabel: 'Review booking',
    intendedRoute: '/account/bookings/[bookingId]',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/account/bookings/{bookingId})',
    fallback: 'Ask the customer to sign in to complete or review payment.',
  },
  {
    emailName: 'Document upload request',
    ctaLabel: 'Upload documents',
    intendedRoute: '/account/documents',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/account/documents)',
    fallback: 'Ask the customer to sign in to their documents page.',
  },
  {
    emailName: 'Refund processed',
    ctaLabel: 'View refunds',
    intendedRoute: '/account/refunds',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/account/refunds)',
    fallback: 'Explain that refund details are available in the dashboard.',
  },
  {
    emailName: 'Vendor new booking',
    ctaLabel: 'View booking',
    intendedRoute: '/vendor/bookings/[bookingId]',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/vendor/bookings/{bookingId})',
    fallback: 'Ask the vendor to sign in to their dashboard.',
  },
  {
    emailName: 'Vendor payout settings',
    ctaLabel: 'Payout settings',
    intendedRoute: '/vendor/payout-settings',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/vendor/payout-settings)',
    fallback: 'Tell the vendor to open payout settings from the dashboard.',
  },
  {
    emailName: 'Vendor payout paid',
    ctaLabel: 'View payouts',
    intendedRoute: '/vendor/payouts',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/vendor/payouts)',
    fallback: 'Tell the vendor to open payouts from the dashboard.',
  },
  {
    emailName: 'Property approved',
    ctaLabel: 'View property fees',
    intendedRoute: '/vendor/property-fees',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/vendor/property-fees)',
    fallback: 'Tell the vendor to open property fees from the dashboard.',
  },
  {
    emailName: 'Ops tasks',
    ctaLabel: 'View service tasks',
    intendedRoute: '/vendor/ops-tasks',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(/vendor/ops-tasks)',
    fallback: 'Tell the vendor to open service tasks from the dashboard.',
  },
  {
    emailName: 'Block request / maintenance update',
    ctaLabel: 'Open request',
    intendedRoute: '/admin/block-requests or /vendor/block-requests',
    routeExists: true,
    finalUrlBuilder: 'frontendUrl(role-safe block request route)',
    fallback: 'Tell the recipient to sign in to their dashboard.',
  },
];

const EXISTING_FRONTEND_ROUTES = new Set([
  '/reset-password',
  '/account/bookings',
  '/account/documents',
  '/account/refunds',
  '/vendor/bookings',
  '/vendor/property-fees',
  '/vendor/payouts',
  '/vendor/payout-settings',
  '/vendor/ops-tasks',
  '/vendor/block-requests',
  '/admin/block-requests',
]);

export function renderNotificationEmail(
  type: string,
  payload: JsonObject,
): RenderedNotificationEmail {
  const brand = resolveEmailBrand(payload);
  const model = buildEmailModel(type, payload, brand);

  return {
    subject: mapEmailSubject(type),
    html: renderEmailLayout({ brand, ...model }),
    text: renderEmailText(brand, model),
  };
}

export function mapEmailSubject(type: string): string {
  switch (type) {
    case 'PASSWORD_RESET_REQUESTED':
      return 'Reset your Laugh & Lodge password';
    case 'EMAIL_VERIFICATION_OTP':
      return 'Your Laugh & Lodge verification code';
    case 'BOOKING_CONFIRMED':
      return 'Your booking is confirmed';
    case 'BOOKING_CANCELLED':
    case 'BOOKING_CANCELLED_BY_GUEST':
      return 'Your booking has been cancelled';
    case 'PAYMENT_FAILED':
      return 'Payment needs your attention';
    case 'PAYMENT_PENDING':
      return 'Payment required to secure your booking';
    case 'REFUND_PROCESSED':
      return 'Your refund has been processed';
    case 'DOCUMENT_UPLOAD_REQUEST':
      return 'Action needed: upload guest documents';
    case 'OPS_TASKS_CREATED':
      return 'Stay services have been scheduled';
    case 'PROPERTY_APPROVED_ACTIVATION_REQUIRED':
      return 'Your property is approved';
    case 'NEW_BOOKING_RECEIVED':
      return 'New booking received';
    case 'VENDOR_PAYOUT_PAID':
      return 'Your payout has been paid';
    case 'MAINTENANCE_REQUEST_CREATED':
      return 'Request update from Laugh & Lodge';
    case 'SMTP_TEST':
      return 'Laugh & Lodge email test';
    default:
      return 'Update from Laugh & Lodge';
  }
}

export function renderEmailLayout(input: EmailModel & { brand: EmailBrand }) {
  const rows = (input.sections ?? [])
    .filter((section) => section.rows.some((row) => present(row.value)))
    .map((section) => renderInfoCard(section.title, section.rows))
    .join('');

  const logo = renderEmailHeader(input.brand, input.eyebrow);
  const badge = input.badge
    ? `<div style="margin:18px 0 0">${renderStatusBadge(input.badge.label, input.badge.tone)}</div>`
    : '';
  const amount = input.amountSummary
    ? renderAmountSummary(
        input.amountSummary.label,
        input.amountSummary.value,
        input.amountSummary.note,
      )
    : '';
  const cta = input.cta
    ? renderPrimaryButton(input.cta.label, input.cta.url)
    : input.fallbackText
      ? renderFallbackNotice(input.fallbackText)
      : '';
  const notice = input.notice ? renderSoftNote(input.notice) : '';
  const security = input.securityNote ? renderSecurityNote(input.securityNote) : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(input.title)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .email-shell { width: 100% !important; }
        .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
        .detail-label, .detail-value { display: block !important; width: 100% !important; text-align: left !important; }
        .detail-value { padding-top: 4px !important; }
        .cta-link { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6efe5;font-family:Arial,Helvetica,sans-serif;color:#231f20;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6efe5;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-shell" style="width:600px;max-width:600px;background:#fffdf8;border:1px solid #e7dac7;border-radius:18px;overflow:hidden;box-shadow:0 18px 42px rgba(83,66,45,0.10);">
            ${logo}
            <tr>
              <td class="mobile-pad" style="padding:30px 34px 34px;background:#fffdf8;">
                <h1 style="margin:0;color:#241f35;font-size:26px;line-height:32px;font-weight:700;letter-spacing:0;">${escapeHtml(input.title)}</h1>
                <p style="margin:12px 0 0;color:#5f5a66;font-size:15px;line-height:24px;">${escapeHtml(input.intro)}</p>
                ${badge}
                ${amount}
                ${rows}
                ${cta}
                ${notice}
                ${security}
              </td>
            </tr>
            ${renderEmailFooter(input.brand)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailHeader(brand: EmailBrand, eyebrow?: string) {
  const wordmark = `<div style="font-size:22px;line-height:28px;font-weight:700;color:#312f69;letter-spacing:0;">${escapeHtml(brand.name)}</div>`;
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="Laugh &amp; Lodge" width="172" style="display:block;max-width:172px;width:172px;height:auto;border:0;outline:none;text-decoration:none;">`
    : wordmark;

  return `<tr>
    <td class="mobile-pad" style="padding:28px 34px 24px;background:#fbf5ea;border-bottom:1px solid #eadcc8;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="left" style="vertical-align:middle;">${logo}</td>
          <td align="right" style="vertical-align:middle;color:#8a714f;font-size:12px;line-height:18px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${escapeHtml(eyebrow || brand.domain)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function renderEmailFooter(brand: EmailBrand) {
  return `<tr>
    <td class="mobile-pad" style="padding:22px 34px;background:#fbf5ea;border-top:1px solid #eadcc8;color:#776f66;font-size:12px;line-height:19px;">
      <div style="font-weight:700;color:#2b2738;font-size:13px;">${escapeHtml(brand.name)}</div>
      <div style="margin-top:3px;">${escapeHtml(brand.country)} &bull; ${escapeHtml(brand.domain)}</div>
      <div style="margin-top:8px;">Need help? Contact <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#4f46a5;text-decoration:none;font-weight:700;">${escapeHtml(brand.supportEmail)}</a>${brand.phone ? ` or ${escapeHtml(brand.phone)}` : ''}.</div>
    </td>
  </tr>`;
}

export function renderInfoCard(title: string, rows: DetailRow[]) {
  const body = rows
    .filter((row) => present(row.value))
    .map((row) => renderDetailRow(row.label, String(row.value), row.strong))
    .join('');
  if (!body) return '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border:1px solid #eadcc8;border-radius:14px;overflow:hidden;background:#ffffff;">
    <tr>
      <td style="padding:13px 16px;background:#fbf7ef;color:#4b3f35;font-size:13px;font-weight:700;border-bottom:1px solid #eadcc8;">${escapeHtml(title)}</td>
    </tr>
    <tr>
      <td style="padding:8px 16px 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
      </td>
    </tr>
  </table>`;
}

export function renderDetailRow(label: string, value: string, strong = false) {
  return `<tr>
    <td class="detail-label" style="width:42%;padding:9px 0;color:#7b736b;font-size:13px;line-height:19px;border-bottom:1px solid #f0e7dc;">${escapeHtml(label)}</td>
    <td class="detail-value" align="right" style="width:58%;padding:9px 0;color:#272233;font-size:14px;line-height:20px;font-weight:${strong ? '700' : '600'};border-bottom:1px solid #f0e7dc;">${escapeHtml(value)}</td>
  </tr>`;
}

export function renderPrimaryButton(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:#5b5bd6;border-radius:10px;">
        <a class="cta-link" href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;line-height:18px;font-weight:700;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function renderStatusBadge(
  label: string,
  tone: 'success' | 'warning' | 'danger' | 'info' = 'info',
) {
  const palette = {
    success: ['#edf8ef', '#2f7d4f', '#b8dfc4'],
    warning: ['#fff7e6', '#9a641e', '#efd09b'],
    danger: ['#fff0ed', '#a64235', '#efc0b7'],
    info: ['#eef0ff', '#4b4ba8', '#cfd3ff'],
  }[tone];

  return `<span style="display:inline-block;padding:7px 11px;border-radius:999px;background:${palette[0]};color:${palette[1]};border:1px solid ${palette[2]};font-size:12px;line-height:15px;font-weight:700;">${escapeHtml(label)}</span>`;
}

export function renderAmountSummary(label: string, value: string, note?: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#f7f4ff;border:1px solid #dcdcff;border-radius:14px;">
    <tr>
      <td style="padding:18px 18px;">
        <div style="color:#68607b;font-size:12px;line-height:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">${escapeHtml(label)}</div>
        <div style="margin-top:6px;color:#29234d;font-size:24px;line-height:30px;font-weight:800;">${escapeHtml(value)}</div>
        ${note ? `<div style="margin-top:6px;color:#6c6676;font-size:13px;line-height:20px;">${escapeHtml(note)}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

export function renderDateRange(checkIn: unknown, checkOut: unknown) {
  const start = formatEmailDate(checkIn);
  const end = formatEmailDate(checkOut);
  if (start && end) return `${start} → ${end}`;
  return start || end || null;
}

export function renderSafeCta(label: string, route: string): Cta | null {
  const url = buildFrontendUrl(route);
  return url ? { label, url } : null;
}

export function formatEmailDate(value: unknown, includeTime = false): string | null {
  const date = parseDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(includeTime
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : {}),
    timeZone: 'Asia/Dubai',
  }).format(date);
}

export function formatEmailMoney(
  value: unknown,
  currency = 'AED',
  opts: { minorUnits?: boolean } = {},
): string | null {
  const parsed = parseAmount(value);
  if (parsed === null) return null;
  const amount = opts.minorUnits ? parsed / 100 : parsed;
  return `${(currency || 'AED').toUpperCase()} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatGuestCount(adults: unknown, children: unknown): string | null {
  const a = toNumber(adults);
  const c = toNumber(children);
  if (a === null && c === null) return null;
  const adultCount = Math.max(0, Math.trunc(a ?? 0));
  const childCount = Math.max(0, Math.trunc(c ?? 0));
  const parts: string[] = [];
  if (adultCount) parts.push(`${adultCount} adult${adultCount === 1 ? '' : 's'}`);
  if (childCount) parts.push(`${childCount} child${childCount === 1 ? '' : 'ren'}`);
  return parts.join(', ') || null;
}

export function formatBookingStatusForEmail(value: unknown): string | null {
  return mapEnumLabel(value, {
    PENDING_PAYMENT: 'Payment pending',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed',
  });
}

export function formatPropertyFeeTypeForEmail(value: unknown): string | null {
  return mapEnumLabel(value, {
    ACTIVATION: 'Activation fee',
    PROPERTY_INSURANCE: 'Property insurance',
    FURNISHING: 'Furnishing fee',
    ONBOARDING: 'Onboarding fee',
  });
}

export function formatPayoutStatusForEmail(value: unknown): string | null {
  return mapEnumLabel(value, {
    READY_FOR_PAYOUT: 'Ready for payout',
    PROCESSING: 'Processing',
    PAID_AWAITING_VENDOR_CONFIRMATION: 'Paid - awaiting confirmation',
    CONFIRMED_RECEIVED: 'Confirmed received',
    ISSUE_REPORTED: 'Issue reported',
  });
}

export function formatRefundStatusForEmail(value: unknown): string | null {
  return mapEnumLabel(value, {
    PENDING: 'Refund pending',
    PROCESSING: 'Processing',
    SUCCEEDED: 'Processed',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  });
}

function buildEmailModel(
  type: string,
  payload: JsonObject,
  brand: EmailBrand,
): EmailModel {
  switch (type) {
    case 'EMAIL_VERIFICATION_OTP':
      return otpEmail(payload, brand);
    case 'PASSWORD_RESET_REQUESTED':
      return passwordResetEmail(payload);
    case 'BOOKING_CONFIRMED':
      return bookingConfirmedEmail(payload);
    case 'BOOKING_CANCELLED':
    case 'BOOKING_CANCELLED_BY_GUEST':
      return bookingCancelledEmail(payload, type === 'BOOKING_CANCELLED_BY_GUEST');
    case 'PAYMENT_PENDING':
      return paymentPendingEmail(payload);
    case 'PAYMENT_FAILED':
      return paymentFailedEmail(payload);
    case 'REFUND_PROCESSED':
      return refundProcessedEmail(payload);
    case 'DOCUMENT_UPLOAD_REQUEST':
      return documentUploadEmail(payload);
    case 'NEW_BOOKING_RECEIVED':
      return newBookingReceivedEmail(payload);
    case 'VENDOR_PAYOUT_PAID':
      return vendorPayoutPaidEmail(payload);
    case 'OPS_TASKS_CREATED':
      return opsTasksEmail(payload);
    case 'PROPERTY_APPROVED_ACTIVATION_REQUIRED':
      return propertyApprovedEmail(payload);
    case 'MAINTENANCE_REQUEST_CREATED':
      return maintenanceRequestEmail(payload);
    case 'SMTP_TEST':
      return smtpTestEmail(payload, brand);
    default:
      return genericEmail(payload);
  }
}

function otpEmail(payload: JsonObject, brand: EmailBrand): EmailModel {
  const otp = stringValue(getNested(payload, 'otp')) || '------';
  const ttl =
    stringValue(getNested(payload, 'ttlMinutes')) ||
    minutesUntil(getNested(payload, 'expiresAt')) ||
    '10';

  return {
    preview: `Your ${brand.name} verification code expires in ${ttl} minutes.`,
    eyebrow: 'Secure verification',
    title: 'Verify your email address',
    intro:
      'Use this one-time code to finish securing your Laugh & Lodge account. The code can only be used once.',
    sections: [
      {
        title: 'Verification code',
        rows: [{ label: 'Code', value: otp, strong: true }],
      },
    ],
    notice: `This code expires in ${ttl} minutes.`,
    securityNote:
      'If you did not request this code, you can ignore this email. Never share verification codes with anyone.',
  };
}

function passwordResetEmail(payload: JsonObject): EmailModel {
  const resetUrl = safePasswordResetUrl(getNested(payload, 'resetUrl'));
  const ttl =
    stringValue(getNested(payload, 'ttlMinutes')) ||
    minutesUntil(getNested(payload, 'expiresAt')) ||
    '30';

  return {
    preview: `Your password reset link expires in ${ttl} minutes.`,
    eyebrow: 'Account security',
    title: 'Reset your Laugh & Lodge password',
    intro:
      'We received a request to reset your password. Use the secure button below to choose a new password.',
    cta: resetUrl ? { label: 'Reset password', url: resetUrl } : null,
    fallbackText: resetUrl
      ? undefined
      : 'For your security, please request a new reset link from the sign-in page.',
    notice: `This link expires in ${ttl} minutes and can only be used once.`,
    securityNote:
      'If you did not request this, you can ignore this email. Your current password will remain unchanged.',
  };
}

function bookingConfirmedEmail(payload: JsonObject): EmailModel {
  const booking = objectValue(getNested(payload, 'booking'));
  const payment = objectValue(getNested(payload, 'payment'));
  const bookingId = stringValue(booking.id);
  const currency = stringValue(booking.currency) || stringValue(payment.currency) || 'AED';
  const amount = formatEmailMoney(booking.totalAmount ?? payment.amount, currency);
  const route = bookingId ? `/account/bookings/${encodeURIComponent(bookingId)}` : '';

  return {
    preview: 'Your Laugh & Lodge booking is confirmed.',
    eyebrow: 'Booking confirmed',
    title: 'Your booking is confirmed',
    intro:
      'Your stay is reserved. We will keep the important details ready in your dashboard.',
    badge: { label: formatBookingStatusForEmail(booking.status) || 'Confirmed', tone: 'success' },
    amountSummary: amount ? { label: 'Total paid', value: amount } : undefined,
    sections: [
      {
        title: 'Stay details',
        rows: [
          { label: 'Property', value: propertyTitle(payload) },
          { label: 'Stay dates', value: renderDateRange(booking.checkIn, booking.checkOut), strong: true },
          { label: 'Guests', value: formatGuestCount(booking.adults, booking.children) || stringValue(booking.guests) },
          { label: 'Booking reference', value: bookingId },
        ],
      },
    ],
    cta: route ? renderSafeCta('View booking', route) : null,
    fallbackText: 'Sign in to your dashboard to view your booking details.',
    notice:
      'Please keep your booking reference for support. We will contact you if anything else is needed before check-in.',
  };
}

function bookingCancelledEmail(payload: JsonObject, byGuest: boolean): EmailModel {
  const booking = objectValue(getNested(payload, 'booking'));
  const cancellation = objectValue(getNested(payload, 'cancellation'));
  const bookingId = stringValue(booking.id);
  const currency = stringValue(booking.currency) || 'AED';
  const refundable = formatEmailMoney(cancellation.refundableAmount, currency);
  const penalty = formatEmailMoney(cancellation.penaltyAmount, currency);
  const route = bookingId ? `/account/bookings/${encodeURIComponent(bookingId)}` : '';

  return {
    preview: 'Your booking cancellation has been processed.',
    eyebrow: byGuest ? 'Guest cancellation' : 'Booking update',
    title: 'Your booking has been cancelled',
    intro:
      'This booking is no longer active. Any eligible refund will be handled according to the booking policy.',
    badge: { label: 'Cancelled', tone: 'danger' },
    sections: [
      {
        title: 'Cancellation details',
        rows: [
          { label: 'Property', value: propertyTitle(payload) },
          { label: 'Stay dates', value: renderDateRange(booking.checkIn, booking.checkOut), strong: true },
          { label: 'Reason', value: formatCancellationReason(cancellation.reason) },
          { label: 'Refundable amount', value: refundable, strong: true },
          { label: 'Cancellation charge', value: penalty },
          { label: 'Booking reference', value: bookingId },
        ],
      },
    ],
    cta: route ? renderSafeCta('Review booking', route) : null,
    fallbackText: 'Sign in to your dashboard to review this cancellation.',
    notice:
      'If a refund applies, processing times depend on the original payment method and your bank.',
  };
}

function paymentPendingEmail(payload: JsonObject): EmailModel {
  const booking = objectValue(getNested(payload, 'booking'));
  const payment = objectValue(getNested(payload, 'payment'));
  const bookingId = stringValue(booking.id) || stringValue(getNested(payload, 'bookingId'));
  const currency = stringValue(payment.currency) || stringValue(booking.currency) || 'AED';
  const amount = formatEmailMoney(payment.amount ?? booking.totalAmount, currency);
  const route = bookingId ? `/account/bookings/${encodeURIComponent(bookingId)}` : '';

  return {
    preview: 'Payment is required to secure your booking.',
    eyebrow: 'Payment required',
    title: 'Payment required to secure your booking',
    intro:
      'Your booking is waiting for payment. Please complete payment from your dashboard so we can confirm your stay.',
    badge: { label: 'Payment pending', tone: 'warning' },
    amountSummary: amount ? { label: 'Amount due', value: amount } : undefined,
    sections: [
      {
        title: 'Booking details',
        rows: [
          { label: 'Property', value: propertyTitle(payload) },
          { label: 'Stay dates', value: renderDateRange(booking.checkIn, booking.checkOut), strong: true },
          { label: 'Payment status', value: 'Payment pending' },
          { label: 'Booking reference', value: bookingId },
        ],
      },
    ],
    cta: route ? renderSafeCta('Review booking', route) : null,
    fallbackText: 'Please sign in to your dashboard to complete payment.',
  };
}

function paymentFailedEmail(payload: JsonObject): EmailModel {
  const booking = objectValue(getNested(payload, 'booking'));
  const payment = objectValue(getNested(payload, 'payment'));
  const bookingId = stringValue(booking.id) || stringValue(getNested(payload, 'bookingId'));
  const currency = stringValue(payment.currency) || stringValue(booking.currency) || 'AED';
  const amount = formatEmailMoney(payment.amount ?? booking.totalAmount, currency);
  const route = bookingId ? `/account/bookings/${encodeURIComponent(bookingId)}` : '';

  return {
    preview: 'Your payment could not be completed.',
    eyebrow: 'Payment update',
    title: 'Payment needs your attention',
    intro:
      'We could not complete the payment for this booking. You can review the booking and try again from your dashboard.',
    badge: { label: 'Payment failed', tone: 'danger' },
    amountSummary: amount ? { label: 'Payment amount', value: amount } : undefined,
    sections: [
      {
        title: 'Payment details',
        rows: [
          { label: 'Property', value: propertyTitle(payload) },
          { label: 'Payment method', value: formatPaymentProvider(payment.provider ?? getNested(payload, 'provider')) },
          { label: 'Reason', value: humanFailureReason(payment.failureReason ?? getNested(payload, 'reason')) },
          { label: 'Booking reference', value: bookingId },
        ],
      },
    ],
    cta: route ? renderSafeCta('Review booking', route) : null,
    fallbackText: 'Please sign in to your dashboard to review the booking and payment status.',
  };
}

function refundProcessedEmail(payload: JsonObject): EmailModel {
  const refund = objectValue(getNested(payload, 'refund'));
  const currency = stringValue(refund.currency) || 'AED';
  const amount = formatEmailMoney(refund.amount, currency);

  return {
    preview: 'Your refund has been processed.',
    eyebrow: 'Refund update',
    title: 'Your refund has been processed',
    intro:
      'The refund has been sent back through the original payment method. Your bank or card provider may take a little longer to show it.',
    badge: { label: formatRefundStatusForEmail(refund.status) || 'Processed', tone: 'success' },
    amountSummary: amount ? { label: 'Refund amount', value: amount } : undefined,
    sections: [
      {
        title: 'Refund details',
        rows: [
          { label: 'Booking reference', value: stringValue(refund.bookingId) },
          { label: 'Refund reference', value: shortReference(refund.id) },
        ],
      },
    ],
    cta: renderSafeCta('View refunds', '/account/refunds'),
    fallbackText: 'Sign in to your dashboard to review refund details.',
    notice:
      'If the amount is not visible yet, allow standard bank or card settlement time.',
  };
}

function documentUploadEmail(payload: JsonObject): EmailModel {
  const booking = objectValue(getNested(payload, 'booking'));
  const documents = objectValue(getNested(payload, 'documents'));
  const missing = formatDocumentTypes(documents.missingTypes ?? documents.requiredTypes);

  return {
    preview: 'Guest documents are needed before check-in.',
    eyebrow: 'Action needed',
    title: 'Upload guest documents for your stay',
    intro:
      'Please upload the required guest documents before arrival so check-in remains smooth and compliant.',
    badge: { label: getNested(payload, 'urgent') ? 'Time sensitive' : 'Documents needed', tone: 'warning' },
    sections: [
      {
        title: 'Document request',
        rows: [
          { label: 'Stay dates', value: renderDateRange(booking.checkIn, booking.checkOut), strong: true },
          { label: 'Required documents', value: missing },
          { label: 'Upload by', value: formatEmailDate(documents.deadline ?? booking.checkIn) },
          { label: 'Booking reference', value: stringValue(booking.id) },
        ],
      },
    ],
    cta: renderSafeCta('Upload documents', '/account/documents'),
    fallbackText: 'Sign in to your dashboard and open Documents to upload the required files.',
  };
}

function newBookingReceivedEmail(payload: JsonObject): EmailModel {
  const booking = objectValue(getNested(payload, 'booking'));
  const payout = objectValue(getNested(payload, 'payout'));
  const bookingId = stringValue(booking.id);
  const currency = stringValue(payout.currency) || stringValue(booking.currency) || 'AED';
  const payoutAmount =
    formatEmailMoney(payout.amountFormatted, currency) ||
    formatEmailMoney(payout.amount, currency, { minorUnits: true });
  const hasPayoutDetails = !String(payout.methodMessage ?? '').toLowerCase().includes('add your payout');
  const cta = bookingId
    ? renderSafeCta('View booking', `/vendor/bookings/${encodeURIComponent(bookingId)}`)
    : renderSafeCta('View payouts', '/vendor/payouts');

  return {
    preview: 'A guest has booked your property.',
    eyebrow: 'Vendor booking',
    title: 'Your property has a new booking',
    intro:
      'A guest has completed a paid booking. The payout amount below is the vendor net payable amount.',
    badge: { label: formatBookingStatusForEmail(booking.status) || 'Confirmed', tone: 'success' },
    amountSummary: payoutAmount
      ? { label: 'Estimated payout', value: payoutAmount, note: stringValue(payout.expectedTiming) ? `Expected ${stringValue(payout.expectedTiming)}.` : undefined }
      : undefined,
    sections: [
      {
        title: 'Booking summary',
        rows: [
          { label: 'Property', value: propertyTitle(payload), strong: true },
          { label: 'Stay dates', value: renderDateRange(booking.checkIn, booking.checkOut), strong: true },
          { label: 'Booking reference', value: bookingId },
          { label: 'Payout setup', value: hasPayoutDetails ? 'Saved payout method available' : 'Payout details needed' },
        ],
      },
    ],
    cta,
    fallbackText: 'Sign in to your vendor dashboard to review the booking.',
    notice: hasPayoutDetails
      ? 'We will process the payout to your saved payout method.'
      : 'Please add your payout details from Payout Settings so we can process payouts smoothly.',
  };
}

function vendorPayoutPaidEmail(payload: JsonObject): EmailModel {
  const payout = objectValue(getNested(payload, 'payout'));
  const currency = stringValue(payout.currency) || 'AED';
  const amount =
    formatEmailMoney(payout.amountFormatted, currency) ||
    formatEmailMoney(payout.amount, currency, { minorUnits: true });

  return {
    preview: 'Your payout has been marked as paid.',
    eyebrow: 'Payout paid',
    title: 'Your payout has been paid',
    intro:
      'Laugh & Lodge has marked this payout as paid. Sign in to review the payout record, confirm receipt, or report an issue.',
    badge: { label: 'Paid - awaiting confirmation', tone: 'success' },
    amountSummary: amount ? { label: 'Payout amount', value: amount } : undefined,
    sections: [
      {
        title: 'Payout summary',
        rows: [
          { label: 'Property', value: propertyTitle(payload), strong: true },
          { label: 'Booking reference', value: stringValue(getNested(payload, 'booking.id')) },
          { label: 'Paid date', value: formatEmailDate(payout.paidAt, true) },
          { label: 'Payout reference', value: shortReference(payout.id) },
        ],
      },
    ],
    cta: renderSafeCta('View payouts', '/vendor/payouts'),
    fallbackText: 'Sign in to your vendor dashboard and open Payouts.',
  };
}

function opsTasksEmail(payload: JsonObject): EmailModel {
  return {
    preview: 'Stay services have been scheduled.',
    eyebrow: 'Operations',
    title: 'Stay services have been scheduled',
    intro:
      'The service tasks for this booking are now scheduled. You can review the task list from your vendor dashboard.',
    sections: [
      {
        title: 'Service details',
        rows: [
          { label: 'Services', value: formatOpsTypes(getNested(payload, 'types')), strong: true },
          { label: 'Scheduled for', value: formatEmailDate(getNested(payload, 'scheduledFor'), true) },
          { label: 'Booking reference', value: stringValue(getNested(payload, 'bookingId')) },
        ],
      },
    ],
    cta: renderSafeCta('View service tasks', '/vendor/ops-tasks'),
    fallbackText: 'Sign in to your vendor dashboard and open Service Tasks.',
  };
}

function propertyApprovedEmail(payload: JsonObject): EmailModel {
  const activation = formatEmailMoney(getNested(payload, 'activationFeeFormatted'));
  const insurance = formatEmailMoney(getNested(payload, 'insuranceFeeFormatted'));
  const furnishing = formatEmailMoney(getNested(payload, 'furnishingFeeFormatted'));
  const total = formatEmailMoney(getNested(payload, 'totalFormatted'));

  return {
    preview: 'Your property is approved and activation fees are ready.',
    eyebrow: 'Property approved',
    title: 'Your property is approved',
    intro:
      'Your property has passed review. Activation fees are ready, and you may pay individual fees or all outstanding fees together from your dashboard.',
    badge: { label: 'Approved - activation required', tone: 'success' },
    amountSummary: total ? { label: 'Total due', value: total } : undefined,
    sections: [
      {
        title: 'Property',
        rows: [
          { label: 'Property', value: stringValue(getNested(payload, 'title')), strong: true },
          { label: 'Location', value: stringValue(getNested(payload, 'city')) },
        ],
      },
      {
        title: 'Activation fee breakdown',
        rows: [
          { label: 'Activation fee', value: activation },
          { label: 'Property insurance', value: insurance },
          { label: 'Furnishing fee', value: furnishing },
        ],
      },
    ],
    cta: renderSafeCta('View property fees', '/vendor/property-fees'),
    fallbackText: 'Sign in to your vendor dashboard and open Property Fees.',
  };
}

function maintenanceRequestEmail(payload: JsonObject): EmailModel {
  const blockRequest = objectValue(getNested(payload, 'blockRequest'));
  const title = stringValue(getNested(payload, 'title')) || 'Request update';
  const status = mapEnumLabel(blockRequest.status, {
    PENDING: 'Pending review',
    APPROVED: 'Approved',
    REJECTED: 'Not approved',
  });
  const adminRequest = title.toLowerCase().includes('submitted');
  const route = adminRequest ? '/admin/block-requests' : '/vendor/block-requests';

  return {
    preview: 'There is an update from Laugh & Lodge.',
    eyebrow: 'Request update',
    title: humanTitle(title),
    intro:
      'A request has been updated in the dashboard. Review the details there for the latest status and next steps.',
    badge: status ? { label: status, tone: status === 'Approved' ? 'success' : status === 'Not approved' ? 'danger' : 'warning' } : undefined,
    sections: [
      {
        title: 'Request details',
        rows: [
          { label: 'Property', value: stringValue(blockRequest.propertyTitle), strong: true },
          { label: 'Dates', value: renderDateRange(blockRequest.startDate, blockRequest.endDate), strong: true },
          { label: 'Reason', value: stringValue(blockRequest.reason) },
          { label: 'Review note', value: stringValue(blockRequest.reviewNotes) },
          { label: 'Reference', value: shortReference(blockRequest.id) },
        ],
      },
    ],
    cta: renderSafeCta('Open request', route),
    fallbackText: 'Sign in to your dashboard to review this request.',
  };
}

function smtpTestEmail(payload: JsonObject, brand: EmailBrand): EmailModel {
  return {
    preview: 'Email delivery test from Laugh & Lodge.',
    eyebrow: 'Delivery test',
    title: 'Email delivery is working',
    intro: `This is a transactional email test from ${brand.name}.`,
    sections: [
      {
        title: 'Test details',
        rows: [{ label: 'Reference', value: shortReference(getNested(payload, 'id')) }],
      },
    ],
  };
}

function genericEmail(payload: JsonObject): EmailModel {
  return {
    preview: 'You have an update from Laugh & Lodge.',
    eyebrow: 'Account update',
    title: 'You have an update from Laugh & Lodge',
    intro:
      'Please sign in to your dashboard to review the latest details for your account.',
    sections: [
      {
        title: 'Reference',
        rows: [{ label: 'Reference', value: shortReference(getNested(payload, 'booking.id') ?? getNested(payload, 'id')) }],
      },
    ],
  };
}

function renderEmailText(brand: EmailBrand, model: EmailModel): string {
  const lines: string[] = [
    brand.name,
    '',
    model.title,
    '',
    model.intro,
  ];

  if (model.badge?.label) lines.push('', `Status: ${model.badge.label}`);
  if (model.amountSummary) {
    lines.push('', `${model.amountSummary.label}: ${model.amountSummary.value}`);
    if (model.amountSummary.note) lines.push(model.amountSummary.note);
  }

  for (const section of model.sections ?? []) {
    const rows = section.rows.filter((row) => present(row.value));
    if (!rows.length) continue;
    lines.push('', section.title);
    for (const row of rows) lines.push(`${row.label}: ${row.value}`);
  }

  if (model.cta) lines.push('', `${model.cta.label}: ${model.cta.url}`);
  else if (model.fallbackText) lines.push('', model.fallbackText);

  if (model.notice) lines.push('', model.notice);
  if (model.securityNote) lines.push('', model.securityNote);

  lines.push('', `Support: ${brand.supportEmail}`, brand.domain);
  return lines.filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n').trim();
}

function renderFallbackNotice(text: string) {
  return renderSoftNote(text);
}

function renderSoftNote(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#fff8ec;border:1px solid #ecd6ad;border-radius:12px;">
    <tr><td style="padding:14px 16px;color:#7b5b28;font-size:13px;line-height:21px;">${escapeHtml(text)}</td></tr>
  </table>`;
}

function renderSecurityNote(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#f8fbf8;border:1px solid #d5e7d5;border-radius:12px;">
    <tr><td style="padding:14px 16px;color:#4e6a4e;font-size:13px;line-height:21px;">${escapeHtml(text)}</td></tr>
  </table>`;
}

function resolveEmailBrand(payload: JsonObject): EmailBrand {
  const payloadBrand = objectValue(getNested(payload, 'brand'));
  const origin = firstPresentEnv(['APP_ORIGIN', 'FRONTEND_URL', 'WEB_APP_URL', 'WEB_BASE_URL', 'NEXT_PUBLIC_SITE_URL']);
  const domain = safeDomain(origin) || 'rentpropertyuae.com';
  const logoUrl = safeHttpsUrl(firstPresentEnv(['EMAIL_BRAND_LOGO_URL', 'BRAND_LOGO_URL']));

  return {
    name: stringValue(payloadBrand.name) || 'Laugh & Lodge',
    legalName: stringValue(payloadBrand.legalName) || 'Laugh & Lodge',
    domain: stringValue(payloadBrand.domain) || domain,
    supportEmail:
      stringValue(payloadBrand.supportEmail) ||
      firstPresentEnv(['EMAIL_SUPPORT_EMAIL', 'SMTP_REPLY_TO']) ||
      'info@rentpropertyuae.com',
    bookingEmail:
      stringValue(payloadBrand.bookingEmail) ||
      firstPresentEnv(['EMAIL_BOOKING_EMAIL']) ||
      'booking@rentpropertyuae.com',
    phone: stringValue(payloadBrand.phone) || '+971 50 234 8756',
    country: stringValue(payloadBrand.country) || 'United Arab Emirates',
    logoUrl,
  };
}

function buildFrontendUrl(route: string): string | null {
  const base = firstPresentEnv(['FRONTEND_URL', 'WEB_APP_URL', 'WEB_BASE_URL', 'APP_ORIGIN', 'NEXT_PUBLIC_SITE_URL']);
  if (!base) return null;

  const routePath = route.split('?')[0] || '/';
  const routeRoot = routePath
    .split('/')
    .filter(Boolean)
    .slice(0, routePath.startsWith('/account/bookings/') || routePath.startsWith('/vendor/bookings/') ? 2 : undefined)
    .join('/');
  const normalizedRoot = `/${routeRoot}`;
  if (!EXISTING_FRONTEND_ROUTES.has(routePath) && !EXISTING_FRONTEND_ROUTES.has(normalizedRoot)) {
    return null;
  }

  try {
    const url = new URL(route, base.endsWith('/') ? base : `${base}/`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safePasswordResetUrl(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.pathname !== '/reset-password') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeHttpsUrl(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function propertyTitle(payload: JsonObject): string | null {
  return (
    stringValue(getNested(payload, 'property.title')) ||
    stringValue(getNested(payload, 'booking.propertyTitle')) ||
    stringValue(getNested(payload, 'title')) ||
    null
  );
}

function formatDocumentTypes(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const mapped = value.map((item) =>
    mapEnumLabel(item, {
      PASSPORT: 'Passport',
      EMIRATES_ID: 'Emirates ID',
      VISA: 'Visa',
      OTHER: 'Supporting document',
    }),
  );
  return mapped.filter(Boolean).join(', ') || null;
}

function formatOpsTypes(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  return raw
    .split(',')
    .map((part) => humanTitle(part.trim()))
    .filter(Boolean)
    .join(', ');
}

function formatCancellationReason(value: unknown): string | null {
  return mapEnumLabel(value, {
    CUSTOMER_REQUEST: 'Customer request',
    ADMIN_REQUEST: 'Cancelled by support',
    PAYMENT_FAILED: 'Payment was not completed',
    PROPERTY_UNAVAILABLE: 'Property unavailable',
    OTHER: 'Other',
  });
}

function formatPaymentProvider(value: unknown): string | null {
  return mapEnumLabel(value, {
    STRIPE: 'Card payment',
    MANUAL: 'Manual payment',
  });
}

function humanFailureReason(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return 'The payment provider did not approve this payment.';
  if (/^[A-Z0-9_]+$/.test(raw)) return humanTitle(raw);
  return raw;
}

function humanTitle(value: unknown): string {
  const raw = stringValue(value) || '';
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapEnumLabel(value: unknown, labels: Record<string, string>): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  return labels[raw] ?? humanTitle(raw);
}

function shortReference(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  if (raw.length <= 12) return raw;
  return raw.slice(0, 8);
}

function minutesUntil(value: unknown): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const minutes = Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000));
  return String(minutes);
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const raw = stringValue(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  const raw = stringValue(value);
  if (!raw) return null;
  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = stringValue(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function objectValue(value: unknown): JsonObject {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function getNested(obj: JsonObject, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null || Array.isArray(acc)) return undefined;
    return (acc as JsonObject)[part];
  }, obj);
}

function present(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function firstPresentEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = (process.env[key] ?? '').trim();
    if (!value) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1).trim() || null;
    }
    return value;
  }
  return null;
}

function safeDomain(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
