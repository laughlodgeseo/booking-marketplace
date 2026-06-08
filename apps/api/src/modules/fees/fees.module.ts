import { Module } from '@nestjs/common';
import { PropertyFeeService } from './property-fee.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PropertyFeeService, PrismaService],
  exports: [PropertyFeeService],
})
export class FeesModule {}
