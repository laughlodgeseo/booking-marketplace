import { createHash } from 'crypto';
import { faker } from '@faker-js/faker';

export const SHOWCASE_SEED_TAG = 'showcase-seed-v1';
export const DEFAULT_PASSWORD = 'Password123!';

const DAY_MS = 24 * 60 * 60 * 1000;

export function assertSeed(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`[showcase-seed] ${message}`);
}

export function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16,
  )}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function hashToInt(seed: string): number {
  return Number.parseInt(
    createHash('sha256').update(seed).digest('hex').slice(0, 8),
    16,
  );
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toEmailName(fullName: string): string {
  return slugify(fullName).replace(/-/g, '.');
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

export function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

export function utcDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function eachNight(checkIn: Date, checkOut: Date): Date[] {
  const days: Date[] = [];
  let cursor = new Date(checkIn);
  while (cursor.getTime() < checkOut.getTime()) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

export function isoDay(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class SeededRandom {
  private state: number;

  constructor(seed: string) {
    this.state = hashToInt(seed) || 1;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min: number, max: number, precision = 4): number {
    const value = min + this.next() * (max - min);
    return Number(value.toFixed(precision));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    assertSeed(items.length > 0, 'Cannot pick from an empty array.');
    return items[this.int(0, items.length - 1)];
  }

  sample<T>(items: readonly T[], count: number): T[] {
    const copy = [...items];
    const selected: T[] = [];
    while (selected.length < count && copy.length > 0) {
      selected.push(copy.splice(this.int(0, copy.length - 1), 1)[0]);
    }
    return selected;
  }
}

export function initFaker(seed: number): void {
  faker.seed(seed);
}

export function maskedDatabaseTarget(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  return `${parsed.protocol}//***@${parsed.host}${parsed.pathname}`;
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  assertSeed(value, `${name} is required.`);
  return value;
}

export function optionalIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  assertSeed(Number.isFinite(parsed), `${name} must be a valid integer.`);
  return parsed;
}

export function json(value: unknown): string {
  return JSON.stringify(value);
}

export function roundAed(value: number): number {
  return Math.round(value);
}
