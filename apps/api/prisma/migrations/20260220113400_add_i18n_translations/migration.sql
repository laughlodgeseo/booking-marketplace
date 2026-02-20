-- CreateEnum
CREATE TYPE "LocaleCode" AS ENUM ('en', 'ar');

-- AlterEnum
ALTER TYPE "FxQuoteCurrency" ADD VALUE 'SAR';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "displayCurrency" TEXT NOT NULL DEFAULT 'AED',
ADD COLUMN     "displayTotalAmount" INTEGER,
ADD COLUMN     "fxAsOfDate" TIMESTAMP(3),
ADD COLUMN     "fxProvider" TEXT,
ADD COLUMN     "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "totalAmountAed" INTEGER;

-- AlterTable
ALTER TABLE "BookingCancellation" ADD COLUMN     "displayCurrency" TEXT NOT NULL DEFAULT 'AED',
ADD COLUMN     "displayFxAsOfDate" TIMESTAMP(3),
ADD COLUMN     "displayFxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "penaltyAmountDisplay" INTEGER,
ADD COLUMN     "refundableAmountDisplay" INTEGER,
ADD COLUMN     "totalAmountDisplay" INTEGER;

-- AlterTable
ALTER TABLE "FxRate" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "PropertyActivationInvoice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PropertyHold" ADD COLUMN     "displayCurrency" TEXT NOT NULL DEFAULT 'AED',
ADD COLUMN     "fxAsOfDate" TIMESTAMP(3),
ADD COLUMN     "fxProvider" TEXT,
ADD COLUMN     "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "quotedTotalAed" INTEGER,
ADD COLUMN     "quotedTotalDisplay" INTEGER;

-- CreateTable
CREATE TABLE "PropertyTranslation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "areaLabel" TEXT,
    "tagline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityTranslation" (
    "id" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityGroupTranslation" (
    "id" TEXT NOT NULL,
    "amenityGroupId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityGroupTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxSnapshot" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'AED',
    "quoteCurrency" "FxQuoteCurrency" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyTranslation_locale_idx" ON "PropertyTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_property_translation_property_locale" ON "PropertyTranslation"("propertyId", "locale");

-- CreateIndex
CREATE INDEX "AmenityTranslation_locale_idx" ON "AmenityTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_amenity_translation_amenity_locale" ON "AmenityTranslation"("amenityId", "locale");

-- CreateIndex
CREATE INDEX "AmenityGroupTranslation_locale_idx" ON "AmenityGroupTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_amenity_group_translation_group_locale" ON "AmenityGroupTranslation"("amenityGroupId", "locale");

-- CreateIndex
CREATE INDEX "FxSnapshot_asOfDate_idx" ON "FxSnapshot"("asOfDate");

-- CreateIndex
CREATE INDEX "FxSnapshot_quoteCurrency_asOfDate_idx" ON "FxSnapshot"("quoteCurrency", "asOfDate");

-- AddForeignKey
ALTER TABLE "PropertyTranslation" ADD CONSTRAINT "PropertyTranslation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityTranslation" ADD CONSTRAINT "AmenityTranslation_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityGroupTranslation" ADD CONSTRAINT "AmenityGroupTranslation_amenityGroupId_fkey" FOREIGN KEY ("amenityGroupId") REFERENCES "AmenityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
