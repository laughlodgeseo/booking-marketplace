-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM (
  'APARTMENT',
  'VILLA',
  'STUDIO',
  'TOWNHOUSE',
  'PENTHOUSE',
  'CHALET'
);

-- AlterTable
ALTER TABLE "Property"
ADD COLUMN "propertyType" "PropertyType" NOT NULL DEFAULT 'APARTMENT';

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");
