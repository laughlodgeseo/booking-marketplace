import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { DomainEvent, DomainEventType } from './domain-events';

/**
 * Lightweight in-memory event bus.
 *
 * Uses Node.js EventEmitter as the transport.
 * No Kafka / Redis / external broker needed for Phase 2.
 *
 * Usage:
 *   eventBus.publish(event)             — fire-and-forget
 *   eventBus.subscribe(type, handler)   — register a listener
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // Raise the default limit to avoid spurious MaxListenersExceeded warnings
    // in large NestJS apps with many module subscribers.
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publish a domain event.
   * All registered subscribers for this event type are invoked synchronously
   * before this method returns.
   */
  publish(event: DomainEvent): void {
    this.logger.debug(`domain_event type=${event.type}`);
    this.emitter.emit(event.type, event);
  }

  /**
   * Subscribe to a specific domain event type.
   * Handler receives the typed event payload.
   */
  subscribe<T extends DomainEvent>(
    type: DomainEventType,
    handler: (event: T) => void,
  ): void {
    this.emitter.on(type, handler as (event: DomainEvent) => void);
  }

  /**
   * Remove all listeners for a specific event type (useful for tests).
   */
  removeAllListeners(type?: DomainEventType): void {
    if (type) {
      this.emitter.removeAllListeners(type);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}
