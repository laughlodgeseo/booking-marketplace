-- CreateTable
CREATE TABLE "blocked_dates" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "booking_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_blocked_dates_property_date" ON "blocked_dates"("property_id", "date");

-- CreateIndex
CREATE INDEX "idx_blocked_dates_booking_id" ON "blocked_dates"("booking_id");

-- CreateIndex
CREATE INDEX "idx_blocked_dates_property_date" ON "blocked_dates"("property_id", "date");

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
