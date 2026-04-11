import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { CloudinaryStorageAdapter } from './cloudinary.adapter';
import { LocalStorageAdapter } from './local.adapter';

/**
 * Global storage module.
 *
 * StorageService is @Global so any feature module can inject it
 * without adding StorageModule to its imports array.
 */
@Global()
@Module({
  providers: [StorageService, CloudinaryStorageAdapter, LocalStorageAdapter],
  exports: [StorageService],
})
export class StorageModule {}
