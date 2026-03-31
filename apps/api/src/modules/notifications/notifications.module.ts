import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsWorker } from './notifications.worker';
import { NotificationsSseController } from './notifications-sse.controller';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [NotificationsSseController],
  providers: [
    NotificationsService,
    NotificationEventsService,
    NotificationsWorker,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
