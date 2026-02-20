import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyDocumentsService } from './documents/property-documents.service';
import { VendorPropertyDocumentsController } from './vendor/vendor-property-documents.controller';
import { AdminPropertyDocumentsController } from './admin/admin-property-documents.controller';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [FxModule],
  controllers: [
    PropertiesController,
    VendorPropertyDocumentsController,
    AdminPropertyDocumentsController,
  ],
  providers: [PropertiesService, PropertyDocumentsService],
})
export class PropertiesModule {}
