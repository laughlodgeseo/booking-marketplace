-- CreateEnum
CREATE TYPE "PropertyFurnishingStatus" AS ENUM ('FURNISHED', 'UNFURNISHED');

-- CreateEnum
CREATE TYPE "PropertyFeeType" AS ENUM ('ACTIVATION', 'INSURANCE', 'FURNISHING');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('UNPAID', 'PAID', 'WAIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "furnishingStatus" "PropertyFurnishingStatus";

-- CreateTable
CREATE TABLE "PropertyFee" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "PropertyFeeType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "FeeStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "paidRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyFee_propertyId_idx" ON "PropertyFee"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyFee_vendorId_idx" ON "PropertyFee"("vendorId");

-- CreateIndex
CREATE INDEX "PropertyFee_status_idx" ON "PropertyFee"("status");

-- CreateIndex
CREATE INDEX "PropertyFee_type_idx" ON "PropertyFee"("type");

-- CreateIndex
CREATE INDEX "uniq_property_fee_property_type" ON "PropertyFee"("propertyId", "type");

-- AddForeignKey
ALTER TABLE "PropertyFee" ADD CONSTRAINT "PropertyFee_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFee" ADD CONSTRAINT "PropertyFee_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
