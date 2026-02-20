import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FxModule } from '../fx/fx.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, FxModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
