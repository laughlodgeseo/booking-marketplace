-- Add Stripe payment intent tracking + raw payload storage
ALTER TABLE "Payment" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "rawPayloadJson" TEXT;

CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
