import { Module } from '@nestjs/common';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorCalendarController } from './vendor-calendar.controller';
import { VendorPortalService } from './vendor-portal.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { PortalNotificationsService } from '../common/portal-notifications.service';
import { FeesModule } from '../../modules/fees/fees.module';

@Module({
  imports: [NotificationsModule, FeesModule],
  controllers: [VendorPortalController, VendorCalendarController],
  providers: [VendorPortalService, PrismaService, PortalNotificationsService],
})
export class VendorPortalModule {}
