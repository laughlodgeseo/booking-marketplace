-- AlterTable
ALTER TABLE "PropertyDocument" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "PropertyDocumentStatus" NOT NULL DEFAULT 'UPLOADED';

-- AlterTable
ALTER TABLE "PropertyFee" ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE INDEX "PropertyDocument_status_idx" ON "PropertyDocument"("status");

-- CreateIndex
CREATE INDEX "PropertyFee_stripePaymentIntentId_idx" ON "PropertyFee"("stripePaymentIntentId");
