import { BadRequestException } from '@nestjs/common';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isIsoDay(value: string): boolean {
  return ISO_DAY.test(value);
}

export function utcDateToIsoDay(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function tryIsoDayToUtcDate(value: string): Date | null {
  if (!isIsoDay(value)) return null;
  const [y, m, d] = value.split('-').map((x) => Number(x));
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  return utcDateToIsoDay(date) === value ? date : null;
}

export function assertIsoDay(value: string, fieldName = 'date'): void {
  if (!isIsoDay(value)) {
    throw new BadRequestException(`${fieldName} must be YYYY-MM-DD`);
  }
}

export function isoDayToUtcDate(value: string, fieldName = 'date'): Date {
  assertIsoDay(value, fieldName);
  const parsed = tryIsoDayToUtcDate(value);
  if (!parsed) throw new BadRequestException(`Invalid ${fieldName}.`);
  return parsed;
}

export function normalizeCheckIn(dateStr: string): Date {
  return isoDayToUtcDate(dateStr, 'checkIn');
}

export function normalizeCheckOut(dateStr: string): Date {
  return isoDayToUtcDate(dateStr, 'checkOut');
}

export function assertValidRange(checkIn: Date, checkOut: Date): void {
  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new BadRequestException('checkOut must be after checkIn');
  }
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  return Math.floor((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export type OverlapFilter<TStart extends string, TEnd extends string> = Array<
  { [K in TStart]: { lt: Date } } | { [K in TEnd]: { gt: Date } }
>;

export function buildOverlapFilter<TStart extends string, TEnd extends string>(
  startField: TStart,
  endField: TEnd,
  rangeStart: Date,
  rangeEnd: Date,
): OverlapFilter<TStart, TEnd> {
  return [
    { [startField]: { lt: rangeEnd } } as { [K in TStart]: { lt: Date } },
    { [endField]: { gt: rangeStart } } as { [K in TEnd]: { gt: Date } },
  ];
}
