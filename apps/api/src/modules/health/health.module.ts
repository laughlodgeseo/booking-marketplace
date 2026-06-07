import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [NotificationsModule, PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
