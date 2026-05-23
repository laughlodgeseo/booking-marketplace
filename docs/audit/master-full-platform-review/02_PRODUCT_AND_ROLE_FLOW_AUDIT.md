# 02 — Product & Role Flow Audit

**Audit date:** 2026-05-23  
**Roles:** CUSTOMER, VENDOR, ADMIN, SYSTEM (internal workers)

---

## 1. Role Overview

| Role | Entry Point | Access Scope |
|------|------------|-------------|
| CUSTOMER | `/signup`, `/login` | Public site, account portal, booking flow |
| VENDOR | `/vendor/login` | Vendor portal, own properties only |
| ADMIN | `/login` (then RBAC redirects) | Admin portal, full platform |
| SYSTEM | Internal (workers, cron) | Background jobs only |

---

## 2. Customer Flow (Guest / Booker)

### Registration & Verification

```
1. /signup → POST /auth/register (5/min throttle)
   → User created, CUSTOMER role assigned
   → Verification email sent via Resend
2. /verify-email → GET /auth/verify-email?token=...
   → User.isEmailVerified = true
   → Cannot complete payment without verified email
```

**Assessment:** ✅ Email verification enforced before payment. Correct.

### Discovery & Search

```
3. /properties → GET /search/properties (public)
   → Filters: city, area, dates, guests, price range, amenities
   → Returns paginated PUBLISHED properties only
4. /properties/:slug → GET /search/properties/:slug (public)
   → Property detail with availability calendar
   → QuotePanel calculates total (server-side)
```

**Assessment:** ✅ Search returns only PUBLISHED properties. Quote is server-side — no client manipulation possible.

### Booking Flow

```
5. Customer selects dates + guests → POST /availability/:propertyId/hold
   → Creates 15-minute hold (authenticated)
   → Returns holdId
6. → /checkout/:propertyId?holdId=...
7. → POST /bookings/from-hold (authenticated)
   → Creates Booking in PENDING_PAYMENT status
   → Computes price server-side (including Dubai tax)
8. → POST /payments/authorize
   → Creates Stripe PaymentIntent
   → Returns clientSecret (redacted after use)
9. Customer completes Stripe Elements
10. Stripe sends checkout.session.completed webhook
11. → Booking status: CONFIRMED
    → Notifications sent
12. /payment/return → polls GET /bookings/:id/status
13. → /payment/success or /payment/failed
```

**Assessment:** ✅ Webhook-driven confirmation is correct. Client cannot self-confirm.

**Issue FLOW-01:** If Step 7 fails (hold expired between step 6 and 7), the customer is on checkout page with no hold — should redirect to property with error. Whether this error case is handled gracefully is UNKNOWN.

### Post-Booking

```
Customer can:
- View booking status and details in /account/bookings
- Download travel documents
- Track refund status
- Message admin (not vendor)
- Leave review (after booking COMPLETED)
```

**Issue FLOW-02:** Customers cannot leave a review until booking is COMPLETED. Whether this status is verified at the API layer (not just UI) needs confirmation.

---

## 3. Vendor Flow (Property Owner / Operator)

### Onboarding

```
1. /signup → POST /auth/register → CUSTOMER role created
   ← Vendor role upgrade required (separate flow)
   ← OR: admin creates vendor account directly
```

**Issue FLOW-03:** Vendor registration flow is UNCLEAR. No dedicated `/vendor/signup` page found. Whether vendors register as customers then upgrade roles, or have a separate onboarding path, is not documented. This UX gap could cause confusion.

### Property Creation

```
2. /vendor/properties/new → PropertyWizard (7 steps)
   Step 1: Basic info (title, type, area)
   Step 2: Details (rooms, guests, amenities)
   Step 3: Media (photos by category)
   Step 4: Pricing (base, cleaning fee, min nights)
   Step 5: Documents (OWNERSHIP_PROOF, HOLIDAY_HOME_PERMIT)
   Step 6: Review and submit
   Step 7: Activation payment
3. → POST /vendor/properties (creates DRAFT)
4. → Vendor submits → status: IN_REVIEW
5. → Vendor pays activation fee → status: PENDING_ACTIVATION
```

**Assessment:** Activation payment creates a monetization gate before listing goes live. ✅ Smart business model.

### Property Management

```
Vendor can:
- Edit property details (UNKNOWN if allowed in IN_REVIEW status)
- Upload/replace media
- Block calendar dates
- View bookings for own properties
- View financial statements and payouts
- Manage ops tasks (cleaning, linen, inspection)
- Respond to maintenance requests
```

### Revenue Flow

```
Guest pays → Stripe captures → LedgerEntry (CREDIT for vendor)
After stay completes → VendorStatement generated (monthly)
Admin approves payout → Payout record created
Vendor receives funds (mechanism UNKNOWN — manual bank transfer?)
```

**Issue FLOW-04:** Payout disbursement to vendors is the most operationally critical gap. No evidence of IBAN storage or automated bank transfer integration. Current state likely: admin manually processes payouts outside the system.

---

## 4. Admin Flow

### Platform Management

```
Admin capabilities:
- Review and approve/reject properties (review-queue)
- Approve/reject vendor applications
- View and manage all bookings
- Issue refunds (admin-only)
- Process payouts to vendors
- Moderate guest reviews
- Handle contact form submissions
- Verify customer identity documents
- Manage ops tasks and work orders
- View platform-wide analytics
```

**Assessment:** ✅ Admin has comprehensive control. All actions are backend-enforced with ADMIN role.

**Issue FLOW-05:** No admin action audit trail (logged actions). Admin can approve/reject/refund without accountability. This is flagged as AP-01/API-03 across multiple audits.

### Notification Flow

```
Email notifications via Resend (EventOutbox pattern):
- Customer: booking confirmed, booking cancelled, refund issued
- Vendor: new booking for their property, review submitted
- Admin: new property submitted for review, vendor application
```

**Assessment:** ✅ EventOutbox pattern ensures email delivery even if notification service is temporarily down.

---

## 5. SYSTEM Worker Flows

| Worker | Trigger | Action |
|--------|---------|--------|
| `BookingExpiryWorker` | Cron: every 1 min | Cancel PENDING_PAYMENT bookings past `expiresAt` |
| `BookingCompletionWorker` | Cron: scheduled | Auto-complete CONFIRMED bookings after check-out date |
| `RefundAutoProcessorWorker` | Cron: scheduled | Process pending refunds |
| `AutoPayoutWorker` | Cron: scheduled | Process vendor payouts |
| `EventOutboxWorker` | Cron: scheduled | Deliver domain events (emails) |

**Assessment:** ✅ Background workers are well-defined. Running as NestJS scheduled tasks in the same Railway container.

**Issue FLOW-06:** All workers run in the same process as the HTTP server. A CPU-heavy cron job during peak traffic could affect request response times. Consider separating workers into a dedicated Railway service.

---

## 6. Critical Flow Gaps

| Gap | Severity | Detail |
|-----|---------|--------|
| Vendor registration path unclear | P1 | No `/vendor/signup` page; unclear onboarding path |
| Payout disbursement mechanism | P1 | Vendor receives funds how? Bank transfer manual? IBAN not stored |
| Guest↔vendor direct communication | P1 | All comms go through admin; doesn't scale |
| Property status check at booking creation | P0 | Booking can proceed for SUSPENDED property |
| Review verified against COMPLETED booking | P1 | Application-level only, not DB-enforced |
| Checkout error handling for expired hold | P2 | User experience on hold expiry mid-checkout unclear |

---

## 7. Role-Based Access Summary

| Resource | CUSTOMER | VENDOR | ADMIN |
|---------|:---:|:---:|:---:|
| Browse published properties | ✅ | ✅ | ✅ |
| Create booking | ✅ | ❌ | ✅ |
| Manage own properties | ❌ | ✅ (own only) | ✅ (all) |
| Issue refund | ❌ | ❌ | ✅ |
| Approve property | ❌ | ❌ | ✅ |
| View all bookings | ❌ (own) | ❌ (own props) | ✅ (all) |
| View financial statements | ❌ | ✅ (own) | ✅ (all) |
| Manage vendor accounts | ❌ | ❌ | ✅ |

**Assessment:** ✅ RBAC is correctly structured. No role escalation paths found.
