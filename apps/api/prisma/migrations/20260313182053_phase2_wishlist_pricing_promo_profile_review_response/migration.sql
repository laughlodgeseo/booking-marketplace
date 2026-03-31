-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('SEASONAL', 'WEEKEND', 'WEEKDAY', 'HOLIDAY', 'CUSTOM');

-- AlterTable
ALTER TABLE "GuestReview" ADD COLUMN     "hostResponseAt" TIMESTAMP(3),
ADD COLUMN     "hostResponseText" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProvider" TEXT,
ADD COLUMN     "authProviderId" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "PricingRuleType" NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fixedPrice" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER,
    "discountAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "minBookingAmount" INTEGER,
    "maxDiscount" INTEGER,
    "propertyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_propertyId_idx" ON "WishlistItem"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_wishlist_user_property" ON "WishlistItem"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "PricingRule_propertyId_isActive_idx" ON "PricingRule"("propertyId", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_propertyId_startDate_endDate_idx" ON "PricingRule"("propertyId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_validFrom_validTo_idx" ON "PromoCode"("isActive", "validFrom", "validTo");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
