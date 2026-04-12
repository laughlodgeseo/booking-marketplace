import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { AuthModule } from './auth/auth.module';
import { VendorModule } from './vendor/vendor.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OperatorModule } from './modules/operator/operator.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { PortalModule } from './portal/portal.module';

// Workers
import { BookingExpiryWorker } from './workers/booking-expiry.worker';
import { BookingCompletionWorker } from './workers/booking-completion.worker';
import { RefundAutoProcessorWorker } from './workers/refund-auto-processor.worker';
import { AutoPayoutWorker } from './workers/auto-payout.worker';
import { EventOutboxWorker } from './workers/event-outbox.worker';

// Phase 2 — Event Bus
import { EventsModule } from './events/events.module';

// Phase 3 — Infrastructure layer
import { RedisModule } from './infra/redis/redis.module';
import { QueueModule } from './infra/queues/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { CacheInvalidationModule } from './infra/cache-invalidation/cache-invalidation.module';

// Phase 3 — Event Outbox
import { EventOutboxService } from './events/outbox/event-outbox.service';

import { SearchModule } from './modules/search/search.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FxModule } from './modules/fx/fx.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ContactModule } from './modules/contact/contact.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PromoModule } from './modules/promo/promo.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    ScheduleModule.forRoot(),

    // ── Phase 2: Event Bus (global) ──────────────────────────────────────────
    EventsModule,

    // ── Phase 3: Infrastructure layer (global) ───────────────────────────────
    RedisModule, // Redis client + CacheService (@Global)
    StorageModule, // File storage abstraction (@Global)
    QueueModule, // BullMQ queues + StripeWebhookProcessor
    CacheInvalidationModule, // Auto-invalidates cache on domain events

    // ── Core feature modules ─────────────────────────────────────────────────
    PrismaModule,
    AvailabilityModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    VendorModule,
    AdminModule,
    HealthModule,
    PropertiesModule,
    PortalModule,
    BookingsModule,
    OperatorModule,
    PaymentsModule,

    // 🔔 Notifications Layer
    NotificationsModule,

    // 💸 Finance: Statements + Ledger + Payouts
    FinanceModule,
    FxModule,
    MessagingModule,
    ContactModule,

    SearchModule,

    // Phase 2 modules
    WishlistModule,
    CustomerModule,
    ReviewsModule,
    PricingModule,
    PromoModule,

    // Media: direct-upload signature endpoint
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    // Cron workers
    BookingExpiryWorker,
    BookingCompletionWorker,
    RefundAutoProcessorWorker,
    AutoPayoutWorker,
    EventOutboxWorker,

    // Event Outbox service (needs PrismaService — available via PrismaModule global)
    EventOutboxService,

    // Global guard
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
