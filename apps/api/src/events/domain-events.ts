/**
 * Domain Events — Phase 2 Financial System
 *
 * These events are emitted by the financial pipeline and consumed by
 * any module that needs to react to financial state changes.
 * Transport: in-memory EventBusService (no Kafka/Redis required).
 */

export enum DomainEventType {
  BOOKING_CREATED = 'BookingCreated',
  PAYMENT_SUCCEEDED = 'PaymentSucceeded',
  REFUND_REQUESTED = 'RefundRequested',
  REFUND_SUCCEEDED = 'RefundSucceeded',
  PAYOUT_TRIGGERED = 'PayoutTriggered',
  DEPOSIT_RELEASED = 'DepositReleased',
  DEPOSIT_CLAIMED = 'DepositClaimed',
}

export interface BookingCreatedEvent {
  type: DomainEventType.BOOKING_CREATED;
  bookingId: string;
  customerId: string;
  vendorId: string;
  propertyId: string;
  totalAmountAed: number;
  currency: string;
  occurredAt: Date;
}

export interface PaymentSucceededEvent {
  type: DomainEventType.PAYMENT_SUCCEEDED;
  bookingId: string;
  paymentId: string;
  vendorId: string;
  amount: number;
  currency: string;
  provider: string;
  occurredAt: Date;
}

export interface RefundRequestedEvent {
  type: DomainEventType.REFUND_REQUESTED;
  refundId: string;
  bookingId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
}

export interface RefundSucceededEvent {
  type: DomainEventType.REFUND_SUCCEEDED;
  refundId: string;
  bookingId: string;
  paymentId: string;
  vendorId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
}

export interface PayoutTriggeredEvent {
  type: DomainEventType.PAYOUT_TRIGGERED;
  payoutId: string;
  vendorId: string;
  statementId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
}

export interface DepositReleasedEvent {
  type: DomainEventType.DEPOSIT_RELEASED;
  depositId: string;
  bookingId: string;
  vendorId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
}

export interface DepositClaimedEvent {
  type: DomainEventType.DEPOSIT_CLAIMED;
  depositId: string;
  bookingId: string;
  vendorId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
}

export type DomainEvent =
  | BookingCreatedEvent
  | PaymentSucceededEvent
  | RefundRequestedEvent
  | RefundSucceededEvent
  | PayoutTriggeredEvent
  | DepositReleasedEvent
  | DepositClaimedEvent;
