-- P1 Hardening: Prevent cascade deletion of financial records
-- Changes Booking FK constraints from CASCADE to RESTRICT so that
-- hard-deleting a User or Property cannot silently destroy booking/payment/refund history.

-- Drop old FK constraints on Booking table
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_customerId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_propertyId_fkey";

-- Re-add with RESTRICT so deletions are blocked when bookings exist
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
