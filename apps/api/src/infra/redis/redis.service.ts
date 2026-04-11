import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin wrapper around ioredis that manages connection lifecycle.
 *
 * Exposes the raw `client` for services that need low-level access,
 * and re-exports common operations for convenience.
 *
 * IMPORTANT: Redis is a PERFORMANCE layer only.
 * Financial truth lives in PostgreSQL — never in Redis.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client!: Redis;

  onModuleInit(): void {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

    this._client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      connectTimeout: 5_000,
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.warn(`Redis retry attempt ${times} — giving up`);
          return null; // stop retrying
        }
        return Math.min(times * 200, 2_000);
      },
    });

    this._client.on('connect', () =>
      this.logger.log('Redis connected'),
    );
    this._client.on('error', (err: Error) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );
    this._client.on('close', () =>
      this.logger.warn('Redis connection closed'),
    );

    // Non-blocking connect — the cache degrades gracefully if Redis is down.
    this._client.connect().catch((err: Error) =>
      this.logger.warn(`Redis initial connect failed: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this._client.quit();
    } catch {
      this._client.disconnect();
    }
  }

  get client(): Redis {
    return this._client;
  }

  get isReady(): boolean {
    return this._client?.status === 'ready';
  }
}
