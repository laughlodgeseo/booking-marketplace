import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';

/**
 * Global Redis module.
 *
 * Provides RedisService (raw ioredis client) and CacheService (structured cache).
 * Marked @Global so any feature module gets these without explicit import.
 *
 * Degradation strategy:
 * - If Redis is unreachable, CacheService methods silently return null / no-op.
 * - This ensures Redis failure NEVER causes a 500 in the application.
 */
@Global()
@Module({
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService],
})
export class RedisModule {}
