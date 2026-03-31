import { Module } from '@nestjs/common';
import { HostReviewResponseController } from './host-review-response.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HostReviewResponseController],
})
export class ReviewsModule {}
