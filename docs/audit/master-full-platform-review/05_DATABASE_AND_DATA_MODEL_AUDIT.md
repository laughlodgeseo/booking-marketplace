# 05 — Database & Data Model Audit

**Audit date:** 2026-05-23  
**ORM:** Prisma 6.19.2  
**Provider:** Neon PostgreSQL  
**Migrations:** 35 migration files (2026-01-28 → 2026-05-01)

---

## 1. Schema Overview

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| User | All roles (CUSTOMER/VENDOR/ADMIN) | id, email (unique), passwordHash, role, isEmailVerified |
| VendorProfile | Vendor details, status | userId (unique), status (PENDING/APPROVED/REJECTED) |
| Property | Listing | vendorId, slug (unique), status (rich enum), basePrice (INT), currency |
| Location | Geographic data | country, city, area, lat, lng |
| Amenity / AmenityGroup | Amenity catalog | key (unique), groupId, sortOrder |
| PropertyDocument | Ownership docs | propertyId, type, status (UPLOADED/ACCEPTED/REJECTED), storageKey |
| PropertyReview | Admin review history | propertyId, adminId, decision, notes |
| Booking | Core booking | customerId, propertyId, holdId (unique), checkIn/checkOut, status, totalAmount (INT) |
| PropertyHold | Availability hold | propertyId, checkIn/checkOut, expiresAt, status |
| BookingBlockedDate | Date blocking | propertyId, date — unique constraint prevents double booking |
| Payment | Payment record | bookingId (unique), provider, status, amount (INT), stripePaymentIntentId |
| StripeWebhookEvent | Webhook idempotency | eventId (unique), type, bookingId |
| PaymentEvent | Payment audit log | paymentId, type, idempotencyKey — triple unique constraint |
| Refund | Refund record | bookingId, paymentId, status, amount (INT) |
| LedgerEntry | Financial ledger | vendorId, type, direction, amount (INT), idempotencyKey |
| VendorStatement | Monthly statement | vendorId, periodStart/End — unique per vendor/period |
| Payout | Vendor payout | vendorId, statementId (unique), status, amount (INT) |
| GuestReview | Property review | propertyId, bookingId (unique!), customerId, rating, status |
| NotificationEvent | Email notifications | type/channel/entityType/entityId/recipientUserId — unique (idempotency) |
| EventOutbox | Domain event outbox | type, payload, processed flag |
| PromoCode | Promo codes | code (unique), discountPercent/Amount, usageLimit |
| PricingRule | Seasonal pricing | propertyId, startDate/endDate, priceMultiplier/fixedPrice |
| WishlistItem | Customer wishlist | userId + propertyId — unique |
| MessageThread | Admin↔user messaging | adminId + counterpartyUserId — unique |
| ContactSubmission | Contact forms | status (OPEN/RESOLVED) |
| SecurityDeposit | Security deposits | bookingId (unique), mode (NONE/AUTHORIZE/CAPTURE) |
| CancellationPolicyConfig | Per-property policy | propertyId (unique), penalty/free-cancel windows |

---

## 2. Money Handling

| Check | Status | Evidence |
|-------|--------|---------|
| All amounts stored as INT (minor units) | ✅ PASS | `schema.prisma:689` — `basePrice Int`, `cleaningFee Int`, `totalAmount Int` |
| AED canonical currency with display conversion | ✅ PASS | `Booking.totalAmountAed` + `displayTotalAmount` + `fxRate Decimal(18,8)` |
| Ledger entries use INT amounts | ✅ PASS | `LedgerEntry.amount Int` |
| FX rates use high-precision Decimal | ✅ PASS | `FxRate.rate Decimal(18,8)` |
| Refund amounts tracked separately | ✅ PASS | `Refund.amount Int` separate from Payment |
| Payout amounts tracked | ✅ PASS | `Payout.amount Int` |

**Assessment:** Money handling is correct. INT storage in minor units (fils for AED) avoids floating-point precision issues.

---

## 3. Missing DB-Level Constraints

| Constraint | Missing? | Risk | Fix |
|-----------|---------|------|-----|
| `checkOut > checkIn` constraint | ❌ Missing (app-level only) | Application bug could create zero/negative night bookings | Add `@@check` constraint or SQL CHECK |
| `guests > 0` on Booking | ❌ Missing | Zero-guest bookings possible | Add `@@check` or application guard |
| `totalAmount > 0` on Booking | ❌ Missing | Zero-amount booking would skip payment | Add `@@check(totalAmount > 0)` |
| `amount > 0` on Payment | ❌ Missing | Zero-amount payment | Add constraint |
| `refundAmount <= payment.amount` | ❌ Missing (app-level only) | Over-refund possible | Add application-level guard + DB constraint |
| `rating BETWEEN 1 AND 5` on GuestReview | ❌ Missing | Invalid ratings (0, 99) possible | Add `@@check` |
| `minNights > 0` on Property | ❌ Missing | Negative min nights | Add constraint |

---

## 4. Index Analysis

| Table | Existing Indexes | Missing Indexes | Risk |
|-------|----------------|----------------|------|
| Booking | `(propertyId, status, checkIn, checkOut)`, `(customerId)`, `(status)` | — | ✅ Good |
| PropertyHold | `(propertyId, status, checkIn, checkOut, expiresAt)` | — | ✅ Good |
| BookingBlockedDate | `(propertyId, date)` unique | — | ✅ Good |
| Property | `(status, city, area)`, `(vendorId)`, `(city)`, `(basePrice)` | Consider `(slug)` btree index | — |
| Payment | `(status)`, `(provider)`, `(stripePaymentIntentId)` unique | — | ✅ Good |
| NotificationEvent | `(status, nextAttemptAt)`, `(recipientUserId, readAt)` | — | ✅ Good |
| GuestReview | `(propertyId, status)`, `(customerId, createdAt)` | No `(rating)` index | Minor — not needed yet |

---

## 5. Cascade Behavior

| Relationship | OnDelete | Risk |
|-------------|---------|------|
| User → Property (vendor) | Cascade | If vendor deleted, all properties deleted — dangerous |
| Property → Booking | Cascade | Deleting property deletes bookings — dangerous |
| Property → Media | Cascade | ✅ Images removed with property |
| Booking → Payment | Cascade | ✅ Expected |
| User → RefreshToken | Cascade | ✅ Tokens cleaned up |

**P1 Issue:** `User → Property` and `Property → Booking` cascade deletions can destroy financial records. A property with past bookings should never be hard-deleted. Only soft-delete/archive is safe.

---

## 6. Data Quality Issues

| Issue | Severity | Evidence | Fix |
|-------|----------|---------|-----|
| `reviewHistory` stored as JSON on Property | P2 | `schema.prisma:713` — `reviewHistory Json @default("[]")` | Already has `PropertyReview` table; JSON field is legacy/duplicate |
| `documentUrl` + `documentPublicId` on Property | P2 | `schema.prisma:707–709` | Duplicate of `PropertyDocument` table | Remove legacy fields in future migration |
| `rawPayloadJson String?` on Payment stores full Stripe payload | P2 | `schema.prisma:1291` | Could grow very large | Truncate to first 10KB or use JSONB |
| FX rates are "manual" provider with no automation | P1 | `FxRate.provider String @default("manual")` | Rates go stale; customer overpays/underpays | Integrate a free FX API (e.g., exchangerate-api.com) |
| `PropertyCalendarDay` requires individual day records | P2 | `schema.prisma:1320` | 365 rows per property per year for full calendar | Consider range-based approach for scalability |

---

## 7. Review-Tied Booking Enforcement

| Check | Status | Evidence |
|-------|--------|---------|
| One review per booking (unique) | ✅ PASS | `schema.prisma:1108` — `bookingId String @unique` |
| Review linked to completed booking | PARTIAL | `bookingId` is required but `COMPLETED` status not DB-enforced | Add application-level guard |

---

## 8. Soft Delete Strategy

No global soft-delete pattern. The platform uses:
- `PropertyStatus.ARCHIVED` for properties
- `PropertyStatus.SUSPENDED` for admin takedown
- `PropertyDeletionRequest` for vendor-requested deletion (admin must approve)
- `BookingStatus.CANCELLED` for bookings

**Assessment:** This is reasonable for a marketplace. Hard deletion of properties with active/past bookings must be prevented. Current deletion flow requires admin approval via `PropertyDeletionRequest`. ✅

---

## 9. Database Migration Risk

**35 migrations** exist, last applied 2026-05-01. The migration system runs `prisma migrate deploy` on startup (both dev and prod start commands). 

**Risk:** If a migration fails in production, the Railway container will fail to start. There is no mention of a rollback strategy. **Recommend:** Document a rollback migration or use a staging database for migration testing.
