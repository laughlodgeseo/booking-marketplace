ALTER TABLE "Property"
  ADD COLUMN "documentUrl" TEXT,
  ADD COLUMN "documentPublicId" TEXT,
  ADD COLUMN "documentStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "documentRejectionReason" TEXT;
