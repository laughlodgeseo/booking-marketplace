# 07 — Stripe Payment & Booking Audit

**Audit date:** 2026-05-23  
**Severity system:** P0 = Launch Blocker | P1 = High | P2 = Medium | P3 = Low  
**Note:** This covers real-money flows. Evidence references exact file paths.

---

## 1. Overall Verdict

The Stripe integration is **well-architected** for the core payment flow. Webhook signature verification, idempotency, and serializable transactions are all correctly implemented. Several edge cases need hardening before real money flows.

---

## 2. Payment Flow Architecture

```
Customer selects dates
  → AvailabilityService.createHold()          [15 min hold, idempotency key]
  → BookingsService.createFromHold()          [DB booking, PENDING_PAYMENT]
  → PaymentsService.createStripeIntent()      [Stripe PaymentIntent, idempotency key]
  → Stripe Checkout (client-side Elements)
  → Stripe sends checkout.session.completed   [raw body webhook]
  → PaymentsWebhooksController.stripe()
    → Signature verification (constructWebhookEvent)
    → Enqueue to BullMQ (or sync fallback)
  → PaymentsService.handleStripeCheckoutSessionCompleted()
    → Serializable transaction
    → StripeWebhookEvent idempotency check
    → Booking → CONFIRMED
    → Payment → CAPTURED
    → LedgerEntry, OpsTask, SecurityDeposit created
    → Notifications emitted (non-blocking)
```

---

## 3. Critical Payment Checks

| Check | Status | Evidence |
|-------|--------|---------|
| Webhook raw body preserved before JSON parsing | ✅ PASS | `main.ts:51` — `express.raw()` on `/api/webhooks/stripe` BEFORE `express.json()` |
| Stripe signature verified before any processing | ✅ PASS | `payments.webhooks.controller.ts:55–62` — `constructWebhookEvent()` throws on invalid sig |
| Booking confirmation is webhook-only | ✅ PASS | `payments.service.ts:641–644` — customer capture throws "webhook-only" |
| Webhook idempotency (duplicate events rejected) | ✅ PASS | `payments.service.ts:1047–1064` — `StripeWebhookEvent` unique on `eventId` |
| Serializable transaction for booking confirmation | ✅ PASS | `payments.service.ts:1045` — `Prisma.TransactionIsolationLevel.Serializable` |
| Amount mismatch check in payment_intent.succeeded | ✅ PASS | `payments.service.ts:1524–1535` — Stripe amount vs DB payment amount compared |
| Currency mismatch check | ✅ PASS | `payments.service.ts:1514–1523` — currency compared before booking confirmation |
| Booking amount calculated server-side only | ✅ PASS | `bookings.service.ts:67–81` — `computeQuote()` runs server-side |
| Dubai tax calculated server-side | ✅ PASS | `dubai-tax.service.ts` — breakdown computed in `BookingsService.computeQuote()` |
| Price breakdown snapshot saved at booking creation | ✅ PASS | `schema.prisma:1208` — `priceBreakdown Json?` on Booking |
| Refund restricted to ADMIN only | ✅ PASS | `payments.service.ts:871` — throws `ForbiddenException` for non-ADMIN |
| Failed payment does not confirm booking | ✅ PASS | `handleStripePaymentIntentFailed` sets status to FAILED |
| Customer forced to STRIPE provider | ✅ PASS | `payments.service.ts:97` — `CUSTOMER → PaymentProvider.STRIPE` |
| Email must be verified before payment | ✅ PASS | `payments.service.ts:146–158` — `isEmailVerified` check before Stripe intent |
| Checkout success page NOT used as confirmation | ✅ PASS | Frontend polls booking status; confirmation from webhook only |
| BullMQ job deduplication by Stripe eventId | ✅ PASS | `payments.webhooks.controller.ts:79` — `jobId: event.id` |
| Client secret redacted before DB storage | ✅ PASS | `payments.service.ts:2139–2141` — `redactStripePaymentIntent()` sets `client_secret: null` |
| LedgerEntry created for captured payment | ✅ PASS | `payments.service.ts:2403+` — `ensureLedgerForCapturedBooking()` |

---

## 4. Payment Issues Found

### P1 — High Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| PAY-01 | Security deposit is added to Stripe charge without clear itemization in checkout UI | `payments.service.ts:334–358` — `depositAmount` added to `amount` sent to Stripe | Customer charged more than expected with no breakdown | Show security deposit as a separate line item in checkout UI |
| PAY-02 | `toStripeMinorUnits()` has a comment "assumes 2-decimal currencies" but does not validate against supported currency list | `payments.service.ts:2128–2135` | If AED or another currency is accidentally 0-decimal, amount would be 100× wrong | Add explicit currency whitelist or use Stripe's zero-decimal currency list |
| PAY-03 | Synchronous fallback path (when BullMQ unavailable) processes webhook in HTTP request thread — could timeout for slow DB operations | `payments.webhooks.controller.ts:96–107` | Stripe might retry if response is slow, triggering duplicate processing | Add a circuit breaker or max-processing-time guard |
| PAY-04 | Refund amount cap is not DB-enforced — `amountOverride` in `processRefund()` is not bounded against paid amount | `payments.service.ts:909–914` — `amountOverride` used if positive | Admin could issue refund greater than the charged amount | Add check: `if (amountOverride > payment.amount) throw` |

### P2 — Medium Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| PAY-05 | FX rate applied to security deposit uses booking-time rate — deposit amount in display currency could diverge from AED amount if rates change | `payments.service.ts:347–356` | Minor: display amount mismatch; canonical AED amount is correct | Document this; consider always charging security deposit in AED |
| PAY-06 | No explicit check that Stripe PaymentIntent currency matches booking currency in `handleStripeCheckoutSessionCompleted` | `payments.service.ts:1149–1157` — payment_status checked but not currency | Minor risk if Stripe session created with wrong currency | Add currency check in checkout session completed handler |
| PAY-07 | `PromoCode` model exists with `currentUsage` counter but no DB-level unique constraint to prevent race condition on promo code redemption | `schema.prisma:1997–2024` — no serialized redemption | Promo code could be over-redeemed under concurrent load | Use a serializable transaction for promo redemption or DB-level locking |

---

## 5. Booking Logic Checks

| Check | Status | Evidence |
|-------|--------|---------|
| Hold created before booking (prevents checkout without hold) | ✅ PASS | `bookings.service.ts` — `createFromHold()` requires valid hold |
| Hold expiry releases dates | ✅ PASS | `booking-expiry.worker.ts` — expires stale holds |
| Checkout > check-in validated (application layer) | ✅ PASS | `availability.service.ts` — `assertValidRange()` |
| Guest count vs max guests validated | ✅ PASS | Migration `20260501120000_critical_security_guest_counts` |
| Double booking prevented via `BookingBlockedDate` unique constraint | ✅ PASS | `schema.prisma:1257` — `@@unique([propertyId, date])` |
| Booking idempotency key per customer | ✅ PASS | `schema.prisma:1235` — `@@unique([customerId, idempotencyKey])` |
| Cannot book SUSPENDED/ARCHIVED/DRAFT property | UNKNOWN | Not verified in booking service guard |
| Cannot book property with active hold already on same dates | ✅ PASS | Overlap check in availability service |

### P0 — Booking Launch Blocker

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| BOOK-01 | Property status not verified at booking creation time — customer could potentially book a property that gets suspended between hold creation and booking confirmation | `bookings.service.ts:99+` — need to verify `property.status === PUBLISHED` check | Double booking or booking of suspended property | Add `where: { id: propertyId, status: PropertyStatus.PUBLISHED }` check in `createFromHold()` |

### P1 — Booking High Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| BOOK-02 | No DB-level constraint for `checkOut > checkIn` | `schema.prisma:1167–1241` — no DB check constraint | Application bug could create impossible bookings | Add Prisma `@@check` constraint or migration SQL constraint |
| BOOK-03 | Payment window is 15 minutes hardcoded | `bookings.service.ts:31` — `PAYMENT_WINDOW_MINUTES = 15` | Very short for slow internet users or bank 3DS flows | Make configurable; consider 30 minutes |

---

## 6. Cancellation & Refund Logic

| Feature | Status | Evidence |
|---------|--------|---------|
| Cancellation policy config per property | ✅ Present | `CancellationPolicyConfig` model in schema |
| Refundable amount calculated at cancellation | ✅ Present | `BookingCancellation.refundableAmount` field |
| Booking cancellation actor/reason logged | ✅ Present | `BookingCancellation` model with `actor`, `reason` |
| Auto-cancellation on payment failure | ✅ Present | `payments.service.ts:1685–1694` — webhook calls `cancelBooking()` |
| Refund only by ADMIN | ✅ Present | `payments.service.ts:871` |
| Refund creates LedgerEntry | ✅ Present | `payments.service.ts:941` — `ensureLedgerForSucceededRefund()` |

### P1 — Cancellation Issues

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| REF-01 | Admin refund amount override is not bounded against paid amount | `payments.service.ts:909` — no `maxAmount` check | Over-refund possible | `if (override > booking.totalAmount) throw BadRequestException` |
| REF-02 | Customer-facing refund policy page (`/cancellation`, `/refunds`) contains static text — not dynamically sourced from property's `CancellationPolicyConfig` | Static pages found in sitemap.ts | Customer sees platform-wide policy, not property-specific policy | Link property detail to its specific cancellation policy |

---

## 7. Dubai Tax Calculation

The `DubaiTaxService` correctly calculates:
- Service charge: 10% of base total
- Municipality fee: 7% of base total  
- Tourism fee: 6% of base total
- VAT: 5% of subtotal before VAT
- Tourism Dirham: per-night rate based on star rating, capped at 30 nights

**Assessment:** ✅ Calculation is correct and matches Dubai DTCM guidelines. Tax breakdown is stored as JSON snapshot at booking creation for auditability.

**Issue:** Tax rates are hardcoded in `dubai-tax.config.ts`. If DTCM changes rates, a code deploy is required. Consider making rates configurable via admin settings.

---

## 8. Test Scenarios Coverage

| Scenario | Test Exists | File |
|----------|-------------|------|
| Normal checkout.session.completed | ✅ | `payments.service.spec.ts` |
| Duplicate webhook event | ✅ | `payments.service.spec.ts` |
| Payment failed webhook | ✅ | `payments.service.spec.ts` |
| Amount mismatch rejection | ✅ | `payments.service.spec.ts` |
| Hold overlap detection | ✅ | `availability.service.spec.ts` |
| Cancellation policy calculation | ✅ | `cancellation.policy.spec.ts` |
| Booking completion worker | ✅ | `booking-completion.worker.spec.ts` |
| E2E Stripe UI flow | ✅ Partial | `pw-stripe-ui.spec.ts` |
| Refund amount cap enforcement | ❌ Missing | — |
| Double-booking race condition | ❌ Missing | — |
| Property suspended after hold | ❌ Missing | — |
| Concurrent promo code redemption | ❌ Missing | — |
