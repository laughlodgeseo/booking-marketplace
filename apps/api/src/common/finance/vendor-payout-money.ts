export const PLATFORM_COMMISSION_RATE_BPS = 1800;
export const MONEY_BPS_DENOMINATOR = 10000;

export type VendorPayoutBreakdown = {
  grossAmountMinor: number;
  platformCommissionRateBps: number;
  platformCommissionMinor: number;
  vendorNetAmountMinor: number;
};

export function calculateVendorPayout(
  grossAmountMinor: number,
): VendorPayoutBreakdown {
  const gross = Number.isFinite(grossAmountMinor)
    ? Math.trunc(grossAmountMinor)
    : 0;
  if (gross < 0) {
    throw new Error('grossAmountMinor must be non-negative.');
  }

  const platformCommissionMinor = Math.round(
    (gross * PLATFORM_COMMISSION_RATE_BPS) / MONEY_BPS_DENOMINATOR,
  );

  return {
    grossAmountMinor: gross,
    platformCommissionRateBps: PLATFORM_COMMISSION_RATE_BPS,
    platformCommissionMinor,
    vendorNetAmountMinor: gross - platformCommissionMinor,
  };
}

export function formatMoneyMinor(amountMinor: number, currency = 'AED'): string {
  const amount = (Number.isFinite(amountMinor) ? amountMinor : 0) / 100;
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: currency || 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function normalizeIban(value: string | null | undefined): string | null {
  const normalized = (value ?? '').replace(/\s+/g, '').toUpperCase();
  return normalized || null;
}

export function maskIban(value: string | null | undefined): string | null {
  const normalized = normalizeIban(value);
  if (!normalized) return null;
  const last4 = normalized.slice(-4);
  return `•••• ${last4}`;
}

export function groupIban(value: string | null | undefined): string | null {
  const normalized = normalizeIban(value);
  if (!normalized) return null;
  return normalized.replace(/(.{4})/g, '$1 ').trim();
}

export function last4(value: string | null | undefined): string | null {
  const normalized = (value ?? '').replace(/\s+/g, '');
  return normalized ? normalized.slice(-4) : null;
}
