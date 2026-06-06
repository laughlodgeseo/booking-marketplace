-- AlterTable
ALTER TABLE "CustomerDocument" ADD COLUMN     "cloudinaryPublicId" TEXT,
ADD COLUMN     "cloudinaryUrl" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ALTER COLUMN "fileKey" DROP NOT NULL;
