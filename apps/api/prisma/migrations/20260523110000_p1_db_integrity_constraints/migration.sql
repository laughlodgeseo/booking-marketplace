-- P1 Hardening: DB-level check constraints for business invariants
-- These complement service-layer validations with enforcement at the DB level.

-- Booking: checkout must be after checkin
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_checkOut_after_checkIn"
    CHECK ("checkOut" > "checkIn");

-- Booking: guest count must be positive
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_adults_positive"
    CHECK ("adults" > 0);

-- Booking: total amount must be positive (minor currency units)
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_totalAmount_positive"
    CHECK ("totalAmount" > 0);

-- Payment: amount must be positive
ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_amount_positive"
    CHECK ("amount" > 0);

-- GuestReview: rating must be 1-5
ALTER TABLE "GuestReview"
    ADD CONSTRAINT "GuestReview_rating_range"
    CHECK ("rating" >= 1 AND "rating" <= 5);

-- GuestReview: sub-ratings must also be 1-5
ALTER TABLE "GuestReview"
    ADD CONSTRAINT "GuestReview_cleanlinessRating_range"
    CHECK ("cleanlinessRating" >= 1 AND "cleanlinessRating" <= 5);

ALTER TABLE "GuestReview"
    ADD CONSTRAINT "GuestReview_locationRating_range"
    CHECK ("locationRating" >= 1 AND "locationRating" <= 5);

ALTER TABLE "GuestReview"
    ADD CONSTRAINT "GuestReview_communicationRating_range"
    CHECK ("communicationRating" >= 1 AND "communicationRating" <= 5);

ALTER TABLE "GuestReview"
    ADD CONSTRAINT "GuestReview_valueRating_range"
    CHECK ("valueRating" >= 1 AND "valueRating" <= 5);

-- Refund: amount must be positive
ALTER TABLE "Refund"
    ADD CONSTRAINT "Refund_amount_positive"
    CHECK ("amount" > 0);
