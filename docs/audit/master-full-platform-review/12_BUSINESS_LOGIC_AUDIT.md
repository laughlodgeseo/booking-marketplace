# 12 — Business Logic Audit

**Audit date:** 2026-05-23  
**Scope:** Core business rules — booking lifecycle, cancellation policy, promo codes, pricing, availability, financial integrity

---

## 1. Booking Lifecycle State Machine

```
PENDING_PAYMENT
  ├→ CONFIRMED          (via Stripe webhook only)
  ├→ CANCELLED          (auto-expiry, payment failure, or manual cancellation)
  └→ FAILED_PAYMENT     (payment failed webhook)

CONFIRMED
  ├→ CHECKED_IN         (manual or system trigger)
  ├→ COMPLETED          (auto-completion worker)
  └→ CANCELLED          (admin or customer cancellation)
```

### State Transition Guards

| Transition | Enforced By | Assessment |
|-----------|------------|-----------|
| PENDING_PAYMENT → CONFIRMED | Stripe webhook only (not client-side) | ✅ PASS |
| PENDING_PAYMENT → CANCELLED (expired) | `BookingExpiryWorker` cron every minute | ✅ PASS |
| PENDING_PAYMENT → FAILED_PAYMENT | `handleStripePaymentIntentFailed` webhook handler | ✅ PASS |
| CONFIRMED → COMPLETED | `BookingCompletionWorker` cron | ✅ PASS |
| Any → CANCELLED | `BookingsService.cancelBooking()` with actor/reason | ✅ PASS |

### Booking Expiry Worker

```typescript
// booking-expiry.worker.ts
@Cron(CronExpression.EVERY_MINUTE)
async cancelExpiredBookings() {
  // Finds PENDING_PAYMENT bookings where expiresAt <= now
  // Calls cancelBooking() with reason: AUTO_EXPIRED_UNPAID
}
```

**Assessment:** ✅ Correct. Runs every minute. Uses actor `'system-booking-expiry-worker'` with role `'SYSTEM'` for audit trail.

**Issue BL-01:** Worker processes expired bookings sequentially (`for...of` loop). If there are many expired bookings during a backlog (e.g., after a Redis/BullMQ outage), the worker could take longer than 1 minute per cycle, causing overlap. Add concurrency protection or batch limit.

---

## 2. Availability & Hold System

### Hold Creation

```
POST /availability/:propertyId/hold
  → assertValidRange() — checkOut > checkIn, not in past
  → Check for overlapping active holds or confirmed bookings
  → Create PropertyHold (15 min expiry)
  → Return holdId to client
```

### Double Booking Prevention

Three layers:

| Layer | Mechanism | Status |
|-------|----------|--------|
| 1 | Overlap check in `AvailabilityService` before hold | ✅ Application |
| 2 | `BookingBlockedDate` unique constraint `(propertyId, date)` | ✅ DB-enforced |
| 3 | Serializable transaction on booking confirmation | ✅ DB-level |

**Assessment:** ✅ Three-layer protection is strong. The DB unique constraint and serializable isolation prevent race conditions.

**Issue BL-02:** Hold expiry cleanup happens via worker, not triggers. If the worker has a delay (e.g., Railway container restart), stale holds may block bookings for other customers beyond the 15-minute window.

---

## 3. Cancellation Policy Logic

```typescript
// cancellation.policy.ts
// Policy: tiered windows (FREE | PARTIAL | NO_REFUND)
// hoursToCheckIn determines tier:
// - hoursToCheckIn >= freeCancelBeforeHours → FREE (full refund)
// - partialRefundBeforeHours <= hours < freeCancelBeforeHours → PARTIAL
// - hours < noRefundWithinHours → NO_REFUND
```

### Policy Decision Algorithm

| Tier | Window | Refund |
|------|--------|--------|
| FREE | `hours >= freeCancelBeforeHours` | 100% |
| PARTIAL | `partialRefundBeforeHours <= hours < freeCancelBeforeHours` | Configurable % or fixed fee |
| NO_REFUND | `hours < noRefundWithinHours` | 0% |

**Assessment:** ✅ Policy is per-property configurable. Penalty type (PERCENT_TOTAL, PERCENT_NIGHTS, FIXED_FEE) is configurable. `hoursToCheckIn < 0` throws — post-check-in cancellations blocked at application level.

**Issue BL-03:** `nightsBetween()` uses `Math.round()` on floating-point days. This could cause a 1-night discrepancy for bookings that span a DST transition (rare in Dubai/UTC+4, but worth documenting).

**Issue BL-04:** `CancellationPolicyConfig` is per-property but no default policy is enforced if a property has no config. If a property is published without a cancellation policy, the fallback behavior is UNKNOWN.

---

## 4. Promo Code Business Logic

```typescript
// promo.service.ts
async applyPromo(params) {
  // 1. Find by code (case-insensitive, trimmed)
  // 2. Check isActive
  // 3. Check validFrom/validTo date window
  // 4. Check usageLimit > currentUsage
  // 5. Check property restriction (optional)
  // 6. Check minBookingAmount
  // 7. Calculate discount (percent with cap OR flat amount)
  // 8. Cap: discountAmount <= bookingAmount
}
```

**Assessment:** Promo validation logic is correct for happy path.

**Issue BL-05 (Race Condition):** `currentUsage >= usageLimit` check is NOT inside a serializable transaction. Two concurrent requests could both pass the check and both be applied, over-redeeming the promo code. This was flagged in PAY-07.

**Fix:** Wrap `findUnique + increment` in a transaction with `isolation: Serializable` or use `prisma.promoCode.update({ where: { id, currentUsage: { lt: usageLimit } } })` with conditional update.

---

## 5. Pricing Rules

`PricingRule` model: `propertyId, startDate, endDate, priceMultiplier/fixedPrice`

Seasonal pricing allows:
- `priceMultiplier`: multiply base price by factor (e.g., 1.5 for peak season)
- `fixedPrice`: override base price with fixed nightly rate

**Issue BL-06:** Overlapping pricing rules for the same property/date range — behavior undefined. If two rules overlap the same date, which rule wins? No `priority` field or conflict resolution documented.

---

## 6. Dubai Tax Calculation

```typescript
// dubai-tax.service.ts
// Service charge: 10% of base total
// Municipality fee: 7% of base total
// Tourism fee: 6% of base total
// VAT: 5% of subtotal (base + service + municipality + tourism)
// Tourism Dirham: per-night rate by star rating, capped at 30 nights
```

**Assessment:** ✅ Calculation matches Dubai DTCM requirements. Tax breakdown stored as JSON snapshot at booking creation for audit trail.

**Issue BL-07:** Tax rates are hardcoded in `dubai-tax.config.ts`. A DTCM rate change requires a code deploy. Recommend: store rates in admin settings table with effective date.

---

## 7. FX Rate System

```typescript
// FxRate model
// provider: "manual"
// rate: Decimal(18,8)
```

**Issue BL-08 (High):** FX rates are manually entered only. No automated refresh. If AED/USD rate diverges from actual market rate, customers see incorrect price displays. All canonical amounts are in AED (correct), but display amounts could mislead.

**Fix:** Integrate `exchangerate-api.com` or `openexchangerates.org` free tier. Refresh every 4 hours via cron.

---

## 8. Security Deposit Logic

`SecurityDeposit` model: `bookingId, mode (NONE/AUTHORIZE/CAPTURE), status`

Security deposit amount added to Stripe charge total.

**Issue BL-09:** Security deposit `AUTHORIZE` mode reserves funds on customer's card. Whether the authorization is released after check-out (or captured for damages) via an automated flow is UNKNOWN. Risk of unclaimed authorized funds.

---

## 9. Ledger & Financial Integrity

`LedgerEntry` model with double-entry pattern:
- Every capture creates a `LedgerEntry` with `direction: CREDIT` for vendor
- Every refund creates a `LedgerEntry` with `direction: DEBIT`

**Assessment:** ✅ Double-entry accounting prevents lost money events.

**Issue BL-10:** No reconciliation job verifies that `SUM(LedgerEntry.amount WHERE direction=CREDIT) - SUM(LedgerEntry.amount WHERE direction=DEBIT) = SUM(Payout.amount)` per vendor. Ledger drift could go undetected.

---

## 10. Business Logic Issues Summary

### P0 — Launch Blockers

| ID | Issue | Fix |
|----|-------|-----|
| BOOK-01 | Property status not verified at booking creation | Add `status: PropertyStatus.PUBLISHED` check in `createFromHold()` |

### P1 — High Priority

| ID | Issue | Fix |
|----|-------|-----|
| BL-05 | Promo code race condition — concurrent redemption can exceed usage limit | Use serializable transaction for `findUnique + increment` |
| BL-08 | FX rates manually managed — no automated refresh | Integrate free FX API with scheduled refresh |
| BL-04 | No fallback cancellation policy if property has no `CancellationPolicyConfig` | Define and enforce a default platform cancellation policy |

### P2 — Medium Priority

| ID | Issue | Fix |
|----|-------|-----|
| BL-06 | Overlapping pricing rules — no conflict resolution | Add `priority` field or document first-match-wins rule |
| BL-07 | Tax rates hardcoded | Move to admin-configurable settings with effective dates |
| BL-09 | Security deposit authorization release flow UNKNOWN | Implement auto-release after checkout + N days |
| BL-10 | No ledger reconciliation job | Add monthly ledger reconciliation cron |

### P3 — Low Priority

| ID | Issue | Fix |
|----|-------|-----|
| BL-01 | Expiry worker sequential processing — risk of overlap | Add batch limit + `skipLocked` query to prevent concurrent processing |
| BL-02 | Stale holds on worker delay | Add timeout alert if hold cleanup is > 15 minutes behind |
| BL-03 | `Math.round()` in `nightsBetween()` — DST edge case | Document UTC-only dates; add test for DST boundary nights |
