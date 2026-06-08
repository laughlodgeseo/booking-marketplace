import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

import { VendorStatementsService } from './services/vendor-statements.service';
import { PayoutsService } from './services/payouts.service';
import { LedgerService } from './services/ledger.service';
import { VendorPayoutLifecycleService } from './services/vendor-payout-lifecycle.service';

import { PortalVendorStatementsController } from './controllers/portal-vendor-statements.controller';
import { PortalAdminStatementsController } from './controllers/portal-admin-statements.controller';
import { PortalAdminPayoutsController } from './controllers/portal-admin-payouts.controller';
import { PortalVendorPayoutMethodsController } from './controllers/portal-vendor-payout-methods.controller';
import { PortalVendorPayoutsController } from './controllers/portal-vendor-payouts.controller';
import { PortalAdminVendorPayoutMethodsController } from './controllers/portal-admin-vendor-payout-methods.controller';
import { PortalAdminVendorPayoutsController } from './controllers/portal-admin-vendor-payouts.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [
    PortalVendorStatementsController,
    PortalAdminStatementsController,
    PortalAdminPayoutsController,
    PortalVendorPayoutMethodsController,
    PortalVendorPayoutsController,
    PortalAdminVendorPayoutMethodsController,
    PortalAdminVendorPayoutsController,
  ],
  providers: [
    PrismaService,
    VendorStatementsService,
    PayoutsService,
    LedgerService,
    VendorPayoutLifecycleService,
  ],
  exports: [
    VendorStatementsService,
    PayoutsService,
    LedgerService,
    VendorPayoutLifecycleService,
  ],
})
export class FinanceModule {}
