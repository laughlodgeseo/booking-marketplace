import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PublicAvailabilityController } from './controllers/public-availability.controller';
import { VendorAvailabilityController } from './controllers/vendor-availability.controller';
import { HoldsController } from './controllers/holds.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QuoteController } from './controllers/quote.controller';
import { ReserveController } from './controllers/reserve.controller';
import { FxModule } from '../fx/fx.module';
import { PricingModule } from '../pricing/pricing.module';
import { DubaiTaxService } from '../../common/pricing/dubai-tax.service';

@Module({
  imports: [PrismaModule, FxModule, PricingModule],
  controllers: [
    PublicAvailabilityController,
    VendorAvailabilityController,
    HoldsController,
    QuoteController,
    ReserveController,
  ],
  providers: [AvailabilityService, DubaiTaxService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
