import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsModule } from '../../bookings/bookings.module';

import { PaymentsController } from './payments.controller';
import { PaymentsWebhooksController } from './payments.webhooks.controller';
import { PaymentsService } from './payments.service';

import { ManualPaymentsProvider } from './providers/manual.provider';
import { StripePaymentsProvider } from './providers/stripe.provider';
import { QUEUE_NAMES } from '../../infra/queues/queues.constants';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BookingsModule,
    // Optional: registers the producer so the webhook controller can inject the queue.
    // The BullModule.forRoot connection is set up in QueueModule.
    BullModule.registerQueue({ name: QUEUE_NAMES.STRIPE_WEBHOOK }),
  ],
  controllers: [PaymentsController, PaymentsWebhooksController],
  providers: [PaymentsService, ManualPaymentsProvider, StripePaymentsProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
