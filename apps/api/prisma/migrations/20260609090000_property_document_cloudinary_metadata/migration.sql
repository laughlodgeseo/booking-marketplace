ALTER TABLE "PropertyDocument"
  ADD COLUMN "sizeBytes" INTEGER,
  ADD COLUMN "cloudinaryResourceType" TEXT,
  ADD COLUMN "cloudinaryDeliveryType" TEXT,
  ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'cloudinary';
