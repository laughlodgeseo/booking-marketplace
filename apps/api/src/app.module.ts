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

import { BookingExpiryWorker } from './workers/booking-expiry.worker';
import { SearchModule } from './modules/search/search.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FxModule } from './modules/fx/fx.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ContactModule } from './modules/contact/contact.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    AvailabilityModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    VendorModule,
    AdminModule, // ✅ ADMIN WIRED
    HealthModule,
    PropertiesModule,
    PortalModule, // 🧭 PORTAL WIRED
    BookingsModule,
    OperatorModule,
    PaymentsModule,

    // 🔔 Notifications Layer (V1)
    NotificationsModule,

    // 💸 Finance: Statements + Ledger + Payouts
    FinanceModule,
    FxModule,
    MessagingModule,
    ContactModule,

    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    BookingExpiryWorker,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
