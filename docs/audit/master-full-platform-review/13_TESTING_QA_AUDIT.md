# 13 — Testing & QA Audit

**Audit date:** 2026-05-23

---

## 1. Existing Test Coverage

| File | Lines | Type | Key Coverage |
|------|-------|------|-------------|
| `auth.service.spec.ts` | 269 | Unit | Login, register, refresh, OTP |
| `bookings.service.spec.ts` | 541 | Unit | createFromHold, cancellation, expiry |
| `cancellation.policy.spec.ts` | 191 | Unit | Refund calculation per policy |
| `availability.service.spec.ts` | 197 | Unit | Hold creation, overlap detection, quote |
| `payments.service.spec.ts` | 786 | Unit | Stripe webhook handlers, idempotency, refunds |
| `activation-payment.service.spec.ts` | 212 | Unit | Property activation payment flow |
| `search.service.spec.ts` | 386 | Unit | Property search filters, sort |
| `fx-rates.service.spec.ts` | 92 | Unit | FX rate lookup |
| `property-media-storage.spec.ts` | 60 | Unit | Cloudinary upload params |
| `booking-completion.worker.spec.ts` | 102 | Unit | Auto-completion cron |
| `app.controller.spec.ts` | 24 | Unit | Health check |
| `pw-smoke.spec.ts` | 13 | E2E (Playwright) | Homepage smoke test only |
| `pw-stripe-ui.spec.ts` | 118 | E2E (Playwright) | Stripe Elements UI test |

**Total spec lines:** ~2,873 across 12 backend unit test files + 2 Playwright files.

---

## 2. Test Coverage Assessment

### Well-Covered Areas ✅
- Stripe webhook idempotency (payments.service.spec.ts is comprehensive — 786 lines)
- Booking service core flows
- Cancellation policy calculation
- Availability hold and overlap detection
- Search service filters

### Missing Critical Tests ❌

| Missing Test | Priority | Why Needed | Suggested Tool |
|-------------|----------|-----------|----------------|
| E2E: Full booking flow (search → hold → checkout → webhook confirmation) | P0 | Most critical user path | Playwright |
| E2E: Customer cannot access another customer's booking | P0 | IDOR security test | Playwright/Supertest |
| E2E: Vendor cannot edit another vendor's property | P0 | IDOR security test | Supertest |
| E2E: Admin routes require ADMIN role | P0 | RBAC enforcement | Supertest |
| Refund amount cap enforcement | P0 | Money safety | Jest/Supertest |
| Double-booking race condition | P0 | Concurrent requests | Supertest concurrent |
| Property status check at booking creation | P1 | Booking suspended property | Jest |
| Stripe webhook with tampered signature | P1 | Security regression | Jest |
| Password reset flow end-to-end | P1 | Auth correctness | Playwright |
| Email OTP verification flow | P1 | Auth requirement | Playwright |
| Vendor portal: submit/approve/reject flow | P1 | Core vendor UX | Playwright |
| Admin property approval validates completeness | P1 | Listing quality gate | Supertest |
| Customer review tied to completed booking only | P1 | Review integrity | Supertest |
| Promo code concurrent redemption | P2 | Race condition | Supertest concurrent |
| FX rate currency conversion | P2 | Display amount | Jest |
| Responsive layout on mobile 390px | P2 | UX quality | Playwright visual |
| 404 page renders | P2 | UX completeness | Playwright |
| Sitemap returns valid URLs | P3 | SEO | Supertest |

---

## 3. CI/CD Pipeline

CI config at `.github/workflows/ci.yml` — **not reviewed in detail** but confirmed present.

**Recommended pipeline stages:**
1. `pnpm lint` — ESLint
2. `pnpm typecheck` — TypeScript compilation
3. `pnpm test` — Unit tests
4. `pnpm build` — Production build
5. `pnpm audit --prod` — Dependency security scan
6. `playwright test` — E2E smoke tests

---

## 4. Recommended Test Backlog

### P0 — Before Real Users

```
1. E2E: search → hold → checkout → Stripe test webhook → booking confirmed
2. API: POST /bookings with expired hold → 400
3. API: GET /portal/admin/overview with customer JWT → 403
4. API: PATCH /vendor/properties/:id with another vendor's token → 403
5. API: POST /payments/refund with customer token → 403
6. API: POST /webhooks/stripe with invalid signature → 400
7. API: POST /webhooks/stripe with duplicate eventId → 200 (idempotent)
8. API: createBooking for SUSPENDED property → 400
9. API: refund amount > payment.amount → 400
```

### P1 — Before Public Launch

```
10. E2E: vendor registration → property creation → admin approval → property published
11. E2E: customer login → wishlist add/remove
12. E2E: customer cancel booking within free cancel window → refund initiated
13. E2E: vendor login → view bookings and revenue dashboard
14. E2E: admin approve/reject property in review queue
15. API: GuestReview requires completed booking
16. API: rate limiting returns 429 after 5 auth attempts
```

### P2 — Before Scaling

```
17. Load test: 50 concurrent hold requests for same property dates → no double booking
18. Load test: 50 concurrent promo code redemptions → usage limit respected
19. Visual regression: homepage, property detail, checkout on 390px viewport
20. Accessibility: keyboard navigation through booking flow
```

---

## 5. Testing Tools Recommendation

| Purpose | Recommended Tool |
|---------|-----------------|
| Unit tests | Vitest (migrate from Jest for speed) or Jest (current) |
| API integration tests | Supertest + Jest |
| E2E browser tests | Playwright (already partially set up) |
| Stripe webhook testing | Stripe CLI (`stripe listen --forward-to`) |
| DB seeding for tests | Prisma seed with test fixtures |
| Load testing | k6 or Artillery |
| Visual regression | Playwright screenshots |
