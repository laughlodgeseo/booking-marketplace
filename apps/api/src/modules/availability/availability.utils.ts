import { createHash } from 'node:crypto';
import {
  assertIsoDay,
  buildOverlapFilter,
  calculateNights,
  isoDayToUtcDate,
  normalizeCheckIn,
  normalizeCheckOut,
  rangesOverlap,
  utcDateToIsoDay,
  assertValidRange,
  tryIsoDayToUtcDate,
  type OverlapFilter,
} from '../../common/date-range';

export {
  assertIsoDay,
  buildOverlapFilter,
  calculateNights,
  isoDayToUtcDate,
  normalizeCheckIn,
  normalizeCheckOut,
  rangesOverlap,
  utcDateToIsoDay,
  assertValidRange,
  tryIsoDayToUtcDate,
};

export type { OverlapFilter };

// Nights are checkIn..(checkOut-1 day)
export function enumerateNights(checkInUtc: Date, checkOutUtc: Date): Date[] {
  const nights: Date[] = [];
  const start = new Date(checkInUtc.getTime());
  const end = checkOutUtc.getTime();

  if (start.getTime() >= end) return nights;

  for (let t = start.getTime(); t < end; ) {
    nights.push(new Date(t));
    t += 24 * 60 * 60 * 1000;
  }
  return nights;
}

/**
 * Postgres advisory locks accept bigint.
 * We derive a stable bigint from propertyId by hashing it and taking 8 bytes.
 */
export function advisoryLockKeyForProperty(propertyId: string): bigint {
  const hash = createHash('sha256').update(propertyId).digest();
  // take first 8 bytes as signed bigint
  const hi = BigInt(hash.readUInt32BE(0));
  const lo = BigInt(hash.readUInt32BE(4));
  return (hi << 32n) | lo;
}
