import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

/**
 * Global EventBus module.
 *
 * Marked @Global so that any module that imports AppModule
 * automatically gets EventBusService injected without
 * needing to add EventsModule to every feature module's imports.
 */
@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
