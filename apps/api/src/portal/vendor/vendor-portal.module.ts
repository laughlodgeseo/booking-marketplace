import { Module } from '@nestjs/common';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorCalendarController } from './vendor-calendar.controller';
import { VendorPortalService } from './vendor-portal.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { PortalNotificationsService } from '../common/portal-notifications.service';

@Module({
  imports: [NotificationsModule],
  controllers: [VendorPortalController, VendorCalendarController],
  providers: [VendorPortalService, PrismaService, PortalNotificationsService],
})
export class VendorPortalModule {}
