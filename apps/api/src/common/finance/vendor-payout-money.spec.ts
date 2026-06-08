import {
  calculateVendorPayout,
  formatMoneyMinor,
} from './vendor-payout-money';

describe('vendor payout money helper', () => {
  it('calculates AED 8,000 gross into 18% commission and 82% vendor payout', () => {
    const result = calculateVendorPayout(800000);

    expect(result).toEqual({
      grossAmountMinor: 800000,
      platformCommissionRateBps: 1800,
      platformCommissionMinor: 144000,
      vendorNetAmountMinor: 656000,
    });
    expect(formatMoneyMinor(result.vendorNetAmountMinor, 'AED')).toContain(
      '6,560.00',
    );
  });

  it('calculates AED 6,851 gross correctly (100x bug regression test)', () => {
    // payment.amount = 6851 (major AED). Must be multiplied by 100 before calling
    // calculateVendorPayout(). This test proves that calling with 685100 (minor) gives
    // the correct display values, and calling with 6851 (major) gives the wrong ones.
    const majorAed = 6851;
    const minorFils = Math.round(majorAed * 100); // 685100

    const correctResult = calculateVendorPayout(minorFils);
    expect(correctResult.grossAmountMinor).toBe(685100);
    expect(correctResult.platformCommissionMinor).toBe(123318);
    expect(correctResult.vendorNetAmountMinor).toBe(561782);

    expect(formatMoneyMinor(correctResult.grossAmountMinor, 'AED')).toContain('6,851.00');
    expect(formatMoneyMinor(correctResult.platformCommissionMinor, 'AED')).toContain('1,233.18');
    expect(formatMoneyMinor(correctResult.vendorNetAmountMinor, 'AED')).toContain('5,617.82');

    // Confirm the wrong (unscaled) path gives the bad values observed in the bug
    const wrongResult = calculateVendorPayout(majorAed);
    expect(formatMoneyMinor(wrongResult.vendorNetAmountMinor, 'AED')).toContain('56.18');
  });

  it('calculates AED 5,618 expected display from correct minor-unit storage', () => {
    // A booking where vendor net should show ~AED 5,618 — the bug showed AED 56.18
    // grossAmountMinor must be ~685100 for vendorNet to display as 5617.82
    const result = calculateVendorPayout(685100);
    expect(formatMoneyMinor(result.vendorNetAmountMinor, 'AED')).not.toContain('56.18');
    expect(formatMoneyMinor(result.vendorNetAmountMinor, 'AED')).toContain('5,617.82');
  });

  it('formatMoneyMinor divides by 100 exactly once', () => {
    expect(formatMoneyMinor(100, 'AED')).toContain('1.00');
    expect(formatMoneyMinor(1000, 'AED')).toContain('10.00');
    expect(formatMoneyMinor(100000, 'AED')).toContain('1,000.00');
    expect(formatMoneyMinor(800000, 'AED')).toContain('8,000.00');
  });

  it('handles zero gross gracefully', () => {
    const result = calculateVendorPayout(0);
    expect(result.grossAmountMinor).toBe(0);
    expect(result.platformCommissionMinor).toBe(0);
    expect(result.vendorNetAmountMinor).toBe(0);
  });

  it('throws for negative gross', () => {
    expect(() => calculateVendorPayout(-1)).toThrow('non-negative');
  });

  it('commission rounds correctly for fractional fils', () => {
    // 1 AED = 100 fils; 18% of 100 = 18, vendor gets 82
    const result = calculateVendorPayout(100);
    expect(result.platformCommissionMinor).toBe(18);
    expect(result.vendorNetAmountMinor).toBe(82);
  });
});
