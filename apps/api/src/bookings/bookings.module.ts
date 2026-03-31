// src/bookings/bookings.module.ts
import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CancellationPolicyService } from './policies/cancellation.policy';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { PricingModule } from '../modules/pricing/pricing.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule, // 🔔 required for NotificationsService injection
    PricingModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService, CancellationPolicyService],
  // PricingService is provided via PricingModule import
  exports: [BookingsService],
})
export class BookingsModule {}
