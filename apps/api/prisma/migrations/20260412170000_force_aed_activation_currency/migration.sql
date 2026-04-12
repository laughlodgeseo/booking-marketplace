-- Enforce AED as the only activation fee currency going forward
ALTER TABLE "Property"
ALTER COLUMN "activationFeeCurrency" SET DEFAULT 'AED';

-- Self-heal existing property rows that may still carry legacy currency values
UPDATE "Property"
SET "activationFeeCurrency" = 'AED'
WHERE "activationFeeCurrency" IS NULL
   OR UPPER("activationFeeCurrency") <> 'AED';

-- Keep open activation invoices aligned with AED-only flow
UPDATE "PropertyActivationInvoice"
SET "currency" = 'AED'
WHERE status IN ('PENDING', 'PROCESSING', 'FAILED', 'CANCELLED')
  AND ("currency" IS NULL OR UPPER("currency") <> 'AED');
