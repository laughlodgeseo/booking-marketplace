import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { PaymentsController } from './payments.controller';
import { PaymentsWebhooksController } from './payments.webhooks.controller';
import { PaymentsReturnsController } from './payments-returns.controller';
import { PaymentsService } from './payments.service';
import { TelrWebhookGuard } from './guards/telr-webhook.guard';

import { ManualPaymentsProvider } from './providers/manual.provider';
import { TelrPaymentsProvider } from './providers/telr.provider';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    PaymentsController,
    PaymentsWebhooksController,
    PaymentsReturnsController,
  ],
  providers: [
    PaymentsService,
    ManualPaymentsProvider,
    TelrPaymentsProvider,
    TelrWebhookGuard,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
