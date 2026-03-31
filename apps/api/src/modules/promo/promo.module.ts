import { Module } from '@nestjs/common';
import { PromoAdminController, PromoValidateController } from './promo.controller';
import { PromoService } from './promo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromoAdminController, PromoValidateController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
