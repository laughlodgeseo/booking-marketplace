import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { VendorStatementsService } from './services/vendor-statements.service';
import { PayoutsService } from './services/payouts.service';
import { LedgerService } from './services/ledger.service';

import { PortalVendorStatementsController } from './controllers/portal-vendor-statements.controller';
import { PortalAdminStatementsController } from './controllers/portal-admin-statements.controller';
import { PortalAdminPayoutsController } from './controllers/portal-admin-payouts.controller';

@Module({
  controllers: [
    PortalVendorStatementsController,
    PortalAdminStatementsController,
    PortalAdminPayoutsController,
  ],
  providers: [
    PrismaService,
    VendorStatementsService,
    PayoutsService,
    LedgerService,
  ],
  exports: [VendorStatementsService, PayoutsService, LedgerService],
})
export class FinanceModule {}
