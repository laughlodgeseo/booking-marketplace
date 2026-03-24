-- Extend booking lifecycle/payment markers for webhook-only Stripe confirmation
ALTER TYPE "BookingStatus" ADD VALUE 'FAILED';

CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

ALTER TABLE "Booking"
ADD COLUMN "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "stripeSessionId" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Booking_stripeSessionId_key" ON "Booking"("stripeSessionId");

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "bookingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_eventId_key" ON "StripeWebhookEvent"("eventId");
CREATE INDEX "StripeWebhookEvent_bookingId_idx" ON "StripeWebhookEvent"("bookingId");
CREATE INDEX "StripeWebhookEvent_createdAt_idx" ON "StripeWebhookEvent"("createdAt");
