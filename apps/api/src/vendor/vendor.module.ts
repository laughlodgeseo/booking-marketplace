import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { VendorProfileController } from './vendor-profile.controller';
import { VendorPropertiesController } from './vendor-properties.controller';
import { VendorOnboardingController } from './vendor-onboarding.controller';
import { VendorProfileService } from './vendor-profile.service';
import { VendorPropertiesService } from './vendor-properties.service';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { PaymentsModule } from '../modules/payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [
    VendorProfileController,
    VendorPropertiesController,
    VendorOnboardingController,
  ],
  providers: [VendorProfileService, VendorPropertiesService, VendorOnboardingService],
})
export class VendorModule {}
