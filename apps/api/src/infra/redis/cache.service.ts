import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Application cache service.
 *
 * Wraps Redis with:
 * - JSON serialisation / deserialisation
 * - Graceful degradation (cache miss instead of error when Redis is down)
 * - Structured key namespacing helpers
 *
 * TTL constants live here to prevent magic numbers across the codebase.
 */
export const CacheTTL = {
  /** Vendor wallet / ledger aggregate — busted on financial events. */
  VENDOR_WALLET: 300,
  /** Search result page — busted when property changes. */
  SEARCH_RESULTS: 60,
  /** Pricing preview for a specific date range. */
  PRICING_PREVIEW: 120,
  /** FX rate for a currency pair. */
  FX_RATE: 3_600,
  /** Generic short-lived cache. */
  SHORT: 30,
  /** Generic medium-lived cache. */
  MEDIUM: 300,
} as const;

export const CacheKey = {
  vendorWallet: (vendorId: string, currency = 'AED') =>
    `vendor:wallet:${vendorId}:${currency}`,
  searchResults: (hash: string) => `search:results:${hash}`,
  pricingPreview: (propertyId: string, checkIn: string, checkOut: string) =>
    `pricing:${propertyId}:${checkIn}:${checkOut}`,
  fxRate: (from: string, to: string) => `fx:${from}:${to}`,
  vendorWalletPattern: (vendorId: string) => `vendor:wallet:${vendorId}:*`,
} as const;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Get a cached value. Returns null on miss or Redis unavailability.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis.isReady) return null;
    try {
      const raw = await this.redis.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(
        `cache.get failed key=${key}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Set a value in the cache with a TTL in seconds.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis.isReady) return;
    try {
      await this.redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `cache.set failed key=${key}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Delete a single cache key.
   */
  async del(key: string): Promise<void> {
    if (!this.redis.isReady) return;
    try {
      await this.redis.client.del(key);
    } catch (err) {
      this.logger.warn(
        `cache.del failed key=${key}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Delete multiple cache keys atomically (pipeline for performance).
   */
  async mDel(keys: string[]): Promise<void> {
    if (!this.redis.isReady || keys.length === 0) return;
    try {
      const pipeline = this.redis.client.pipeline();
      for (const key of keys) pipeline.del(key);
      await pipeline.exec();
    } catch (err) {
      this.logger.warn(`cache.mDel failed: ${(err as Error).message}`);
    }
  }

  /**
   * Delete all cache keys matching a glob pattern.
   * Uses SCAN to avoid blocking Redis with KEYS on large datasets.
   *
   * NOTE: pattern scanning is O(N) — use only for targeted invalidation
   * (e.g. a single vendor's wallet keys, not '*').
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.redis.isReady) return 0;
    try {
      const keys = await this.scanKeys(pattern);
      if (keys.length === 0) return 0;
      await this.mDel(keys);
      return keys.length;
    } catch (err) {
      this.logger.warn(
        `cache.delPattern failed pattern=${pattern}: ${(err as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * Wrap an async factory with cache-aside logic.
   * Returns the cached value if available, otherwise calls factory, caches, and returns.
   */
  async wrap<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redis.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}
