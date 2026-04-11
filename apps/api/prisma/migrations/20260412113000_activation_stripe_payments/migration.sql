DO $$
BEGIN
  CREATE TYPE "PropertyActivationPaymentStatus" AS ENUM ('UNPAID', 'IN_PROGRESS', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Property"
ADD COLUMN IF NOT EXISTS "activationFee" INTEGER;

ALTER TABLE "Property"
ADD COLUMN IF NOT EXISTS "activationFeeCurrency" TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE "Property"
ADD COLUMN IF NOT EXISTS "activationPaymentStatus" "PropertyActivationPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Backfill:
-- - Admin-created properties should not require activation payment.
-- - Any property with an already-paid activation invoice should be marked paid.
UPDATE "Property"
SET "activationPaymentStatus" = 'PAID'
WHERE "createdByAdminId" IS NOT NULL;

UPDATE "Property" p
SET "activationPaymentStatus" = 'PAID'
WHERE EXISTS (
  SELECT 1
  FROM "PropertyActivationInvoice" i
  WHERE i."propertyId" = p."id"
    AND i."status" = 'PAID'
);

ALTER TABLE "PropertyActivationInvoice"
ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

ALTER TABLE "PropertyActivationInvoice"
ADD COLUMN IF NOT EXISTS "lastError" TEXT;

CREATE INDEX IF NOT EXISTS "Property_activationPaymentStatus_idx"
ON "Property"("activationPaymentStatus");

CREATE INDEX IF NOT EXISTS "PropertyActivationInvoice_stripePaymentIntentId_idx"
ON "PropertyActivationInvoice"("stripePaymentIntentId");

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyActivationInvoice_stripePaymentIntentId_key"
ON "PropertyActivationInvoice"("stripePaymentIntentId");
