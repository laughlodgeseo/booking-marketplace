import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { PropertyMediaZipService } from './property-media-zip.service';

@Module({
  controllers: [MediaController],
  providers: [PropertyMediaZipService],
  exports: [PropertyMediaZipService],
})
export class MediaModule {}
