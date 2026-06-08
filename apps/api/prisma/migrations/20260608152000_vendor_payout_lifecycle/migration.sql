-- Vendor payout lifecycle, payout methods, and payout proof metadata.

CREATE TYPE "VendorPayoutMethodType" AS ENUM (
  'UAE_BANK_TRANSFER',
  'INTERNATIONAL_BANK_TRANSFER',
  'OTHER_MANUAL',
  'STRIPE_CONNECT'
);

CREATE TYPE "PayoutMethodStatus" AS ENUM (
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED',
  'DISABLED'
);

CREATE TYPE "VendorPayoutStatus" AS ENUM (
  'PENDING_DETAILS',
  'READY_FOR_PAYOUT',
  'PROCESSING',
  'PAID_AWAITING_VENDOR_CONFIRMATION',
  'CONFIRMED_RECEIVED',
  'DISPUTED',
  'CANCELLED'
);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VENDOR_PAYOUT_PAID';

CREATE TABLE "VendorPayoutMethod" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "type" "VendorPayoutMethodType" NOT NULL,
  "status" "PayoutMethodStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "accountHolderName" TEXT,
  "bankName" TEXT,
  "iban" TEXT,
  "accountNumberLast4" TEXT,
  "accountNumberEnc" TEXT,
  "swiftCode" TEXT,
  "bankCountry" TEXT,
  "bankCity" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "transferInstructions" TEXT,
  "manualMethodLabel" TEXT,
  "manualIdentifier" TEXT,
  "manualInstructions" TEXT,
  "contactDetail" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VendorPayoutMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorPayout" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "propertyId" TEXT,
  "bookingId" TEXT,
  "payoutMethodId" TEXT,
  "grossBookingAmountMinor" INTEGER NOT NULL,
  "platformCommissionRateBps" INTEGER NOT NULL DEFAULT 1800,
  "platformCommissionMinor" INTEGER NOT NULL,
  "vendorNetAmountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "status" "VendorPayoutStatus" NOT NULL DEFAULT 'PENDING_DETAILS',
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "adminNotes" TEXT,
  "vendorConfirmationNote" TEXT,
  "proofDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutProofDocument" (
  "id" TEXT NOT NULL,
  "payoutId" TEXT NOT NULL,
  "uploadedByAdminId" TEXT NOT NULL,
  "originalName" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "cloudinaryPublicId" TEXT NOT NULL,
  "cloudinaryResourceType" TEXT,
  "cloudinaryDeliveryType" TEXT,
  "storageProvider" TEXT NOT NULL DEFAULT 'cloudinary',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PayoutProofDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VendorPayoutMethod_vendorId_idx" ON "VendorPayoutMethod"("vendorId");
CREATE INDEX "VendorPayoutMethod_status_idx" ON "VendorPayoutMethod"("status");
CREATE INDEX "VendorPayoutMethod_type_idx" ON "VendorPayoutMethod"("type");
CREATE INDEX "VendorPayoutMethod_vendorId_isDefault_idx" ON "VendorPayoutMethod"("vendorId", "isDefault");

CREATE UNIQUE INDEX "VendorPayout_bookingId_key" ON "VendorPayout"("bookingId");
CREATE UNIQUE INDEX "VendorPayout_proofDocumentId_key" ON "VendorPayout"("proofDocumentId");
CREATE INDEX "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");
CREATE INDEX "VendorPayout_propertyId_idx" ON "VendorPayout"("propertyId");
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");
CREATE INDEX "VendorPayout_dueAt_idx" ON "VendorPayout"("dueAt");
CREATE INDEX "VendorPayout_createdAt_idx" ON "VendorPayout"("createdAt");

CREATE UNIQUE INDEX "PayoutProofDocument_payoutId_key" ON "PayoutProofDocument"("payoutId");
CREATE INDEX "PayoutProofDocument_uploadedByAdminId_idx" ON "PayoutProofDocument"("uploadedByAdminId");
CREATE INDEX "PayoutProofDocument_createdAt_idx" ON "PayoutProofDocument"("createdAt");

ALTER TABLE "VendorPayoutMethod"
  ADD CONSTRAINT "VendorPayoutMethod_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorPayout"
  ADD CONSTRAINT "VendorPayout_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorPayout"
  ADD CONSTRAINT "VendorPayout_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorPayout"
  ADD CONSTRAINT "VendorPayout_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorPayout"
  ADD CONSTRAINT "VendorPayout_payoutMethodId_fkey"
  FOREIGN KEY ("payoutMethodId") REFERENCES "VendorPayoutMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayoutProofDocument"
  ADD CONSTRAINT "PayoutProofDocument_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "VendorPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutProofDocument"
  ADD CONSTRAINT "PayoutProofDocument_uploadedByAdminId_fkey"
  FOREIGN KEY ("uploadedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
