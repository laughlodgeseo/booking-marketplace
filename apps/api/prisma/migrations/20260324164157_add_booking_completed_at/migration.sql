-- DropIndex
DROP INDEX "Booking_stripeSessionId_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "completedAt" TIMESTAMP(3);
