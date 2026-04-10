-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "priceBreakdown" JSONB;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "starRating" INTEGER DEFAULT 3;

-- AlterTable
ALTER TABLE "PropertyHold" ADD COLUMN     "quotedBreakdown" JSONB;
