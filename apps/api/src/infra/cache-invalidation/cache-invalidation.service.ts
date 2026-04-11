import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../events/event-bus.service';
import { CacheService, CacheKey } from '../redis/cache.service';
import {
  DomainEventType,
  type PaymentSucceededEvent,
  type RefundSucceededEvent,
  type DepositReleasedEvent,
  type DepositClaimedEvent,
} from '../../events/domain-events';

/**
 * Cache invalidation service.
 *
 * Subscribes to domain events (emitted in-process via EventBusService) and
 * invalidates the relevant Redis cache entries when financial state changes.
 *
 * Rules:
 * - Redis is ONLY a performance cache — it is never authoritative.
 * - A cache miss is always safe: the caller reads from Postgres as fallback.
 * - This service is best-effort: if invalidation fails, the cache TTL ensures
 *   eventual consistency within CacheTTL.VENDOR_WALLET seconds.
 */
@Injectable()
export class CacheInvalidationService implements OnModuleInit {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly cache: CacheService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<PaymentSucceededEvent>(
      DomainEventType.PAYMENT_SUCCEEDED,
      (e) => void this.onPaymentSucceeded(e),
    );

    this.eventBus.subscribe<RefundSucceededEvent>(
      DomainEventType.REFUND_SUCCEEDED,
      (e) => void this.onRefundSucceeded(e),
    );

    this.eventBus.subscribe<DepositReleasedEvent>(
      DomainEventType.DEPOSIT_RELEASED,
      (e) => void this.onDepositReleased(e),
    );

    this.eventBus.subscribe<DepositClaimedEvent>(
      DomainEventType.DEPOSIT_CLAIMED,
      (e) => void this.onDepositClaimed(e),
    );

    this.logger.log('CacheInvalidationService: subscribed to domain events');
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private async onPaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    await this.bustVendorWallet(event.vendorId, event.bookingId);
  }

  private async onRefundSucceeded(event: RefundSucceededEvent): Promise<void> {
    await this.bustVendorWallet(event.vendorId, event.bookingId);
  }

  private async onDepositReleased(event: DepositReleasedEvent): Promise<void> {
    await this.bustVendorWallet(event.vendorId, null);
  }

  private async onDepositClaimed(event: DepositClaimedEvent): Promise<void> {
    await this.bustVendorWallet(event.vendorId, null);
  }

  // ── Cache busting helpers ──────────────────────────────────────────────────

  /**
   * Invalidate all vendor wallet cache keys across all currencies.
   * Also invalidates any search/pricing keys related to this booking's property.
   */
  private async bustVendorWallet(
    vendorId: string,
    bookingId: string | null,
  ): Promise<void> {
    try {
      // Bust all currency variants for this vendor
      const deleted = await this.cache.delPattern(
        CacheKey.vendorWalletPattern(vendorId),
      );

      this.logger.debug(
        `cache_invalidated vendorId=${vendorId} bookingId=${bookingId ?? 'n/a'} keysDeleted=${deleted}`,
      );
    } catch (err) {
      // Non-critical — cache will expire naturally
      this.logger.warn(
        `cache_invalidation_failed vendorId=${vendorId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Invalidate search result cache for a specific query hash.
   * Called when a property's pricing or availability changes.
   */
  async bustSearchCache(queryHash: string): Promise<void> {
    await this.cache.del(CacheKey.searchResults(queryHash));
  }

  /**
   * Invalidate all search caches (broad invalidation — use sparingly).
   */
  async bustAllSearchCaches(): Promise<void> {
    await this.cache.delPattern('search:results:*');
  }

  /**
   * Invalidate pricing preview for a specific property + date range.
   */
  async bustPricingPreview(
    propertyId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    await this.cache.del(CacheKey.pricingPreview(propertyId, checkIn, checkOut));
  }
}
