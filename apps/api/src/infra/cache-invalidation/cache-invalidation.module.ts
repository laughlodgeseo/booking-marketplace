import { Module } from '@nestjs/common';
import { CacheInvalidationService } from './cache-invalidation.service';

/**
 * Cache invalidation module.
 *
 * Wires CacheInvalidationService into the application.
 * Depends on RedisModule (global) and EventsModule (global) so no imports needed.
 */
@Module({
  providers: [CacheInvalidationService],
  exports: [CacheInvalidationService],
})
export class CacheInvalidationModule {}
