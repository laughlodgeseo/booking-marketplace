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
});
