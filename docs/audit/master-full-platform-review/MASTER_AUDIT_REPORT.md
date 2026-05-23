# MASTER AUDIT REPORT — RentPropertyUAE / Laugh & Lodge

**Platform:** RentPropertyUAE / Laugh & Lodge  
**Live URL:** https://www.rentpropertyuae.com  
**Audit date:** 2026-05-23  
**Audit type:** Complete platform review — architecture, security, payments, business logic, UX, performance, SEO, testing, deployment  
**Auditor:** Comprehensive automated codebase audit  
**Branch:** `audit/master-full-platform-review`

---

## Part 1: Platform Overview

RentPropertyUAE is a managed short-term rental marketplace for the Dubai/UAE market. It operates as a curated platform ("hotel-grade operations, home-style comfort") with three user roles: guests, vendors (property owners), and administrators.

**Technology Stack:**
- Frontend: Next.js 16.1.5 + React 19 + TailwindCSS v4 → Vercel
- Backend: NestJS 11 + Prisma 6.19.2 → Railway (Dockerfile)
- Database: Neon PostgreSQL (serverless)
- Queue: BullMQ + Redis
- Payments: Stripe
- Media: Cloudinary
- Email: Resend
- i18n: English + Arabic (RTL)

---

## Part 2: Overall Verdict

**The platform is architecturally sound but NOT ready for live payments in its current state.**

The critical CORS misconfiguration alone means the production website cannot communicate with the API backend. Three P0 issues in the payment/booking flow create financial and data integrity risks. These require a combined ~2 hours of engineering to fix.

The payment infrastructure itself is well-built: Stripe webhook signature verification, serializable transactions, idempotency, and server-side price calculation are all correctly implemented. The Dubai tax calculation matches DTCM requirements precisely.

---

## Part 3: Issue Summary by Severity

### P0 — Launch Blockers (Fix before any real traffic)

| ID | Source | Issue | Fix Time |
|----|--------|-------|:---:|
| FIX-001 | API-CORS | `https://www.rentpropertyuae.com` not in CORS allowlist — production site cannot reach API | 5 min |
| FIX-002 | BOOK-01 | No `status: PUBLISHED` check at booking creation — suspended property can be booked | 30 min |
| FIX-003 | PAY-04 / REF-01 | Admin refund `amountOverride` not bounded — over-refund possible | 15 min |
| FIX-004 | API-07 | `X-Correlation-Id` client-injectable → log poisoning | 15 min |
| FIX-005 | API-01 | Swagger docs exposed in production via `SWAGGER_ENABLED=true` | 30 min |
| FIX-006 | API-02 | `/auth/refresh` has no explicit throttle — token spam possible | 15 min |
| FIX-007 | MEDIA-02 | `multer ^2.0.2` has HIGH severity DoS CVEs | 1 hr |
| FIX-008 | AP-05 | Admin document download path traversal — `storageKey` not sanitized | 30 min |
| CP-03 | SEC | IDOR risk: customer endpoints must verify `customerId === req.user.id` | 2 hrs |

**Total estimated fix time: ~5 hours**

---

### P1 — High Priority (Fix within 2 weeks)

| ID | Source | Issue |
|----|--------|-------|
| FIX-009 | PAY-07 / BL-05 | Promo code concurrent redemption race condition |
| FIX-010 | DB | 7 missing DB check constraints (checkOut > checkIn, amounts > 0, rating 1-5) |
| FIX-011 | PERF-04 | Missing `Property.slug` index |
| FIX-012 | DEPLOY-01 | Non-multi-stage Dockerfile — source code in production image |
| FIX-013 | DEPLOY-02 | Prisma migrations in container startup → restart loop on failure |
| FIX-014 | BL-08 / DB | FX rates manual only — stale exchange rates |
| FIX-015 | CP-01 / CP-03 | Customer portal IDOR audit + role guard verification |
| API-03 | API | No admin action audit log |
| BL-04 | BL | No default cancellation policy if property has no config |
| VP-04 | VP | AutoPayout mechanism unclear |
| MEDIA-01 | MEDIA | Unsigned Cloudinary uploads if only preset set |
| AP-03 | ADMIN | Vendor document verification not gated in approval flow |

---

### P2 — Medium Priority (Before marketing push)

| Category | Issues |
|----------|--------|
| SEO | Missing JSON-LD, missing hreflang, sitemap limited to 100 properties, incorrect lastModified |
| Performance | `minimumCacheTTL: 60` too short; no caching on analytics; Neon cold start |
| UX | No map search, no Apple Pay/Google Pay, security deposit not itemized, static cancel policy on property page |
| Business | Overlapping pricing rules unresolved, security deposit release flow unclear, no FX auto-refresh |
| Data | `reviewHistory` JSON duplicate on Property, `rawPayloadJson` can grow large |
| Operations | Wizard state lost on refresh, DRAFT properties accumulate |
| Auth | Role stale in JWT for 40 min if admin changes user role |

---

### P3 — Low Priority (Polish / scaling)

- Bundle size not tracked in CI
- No PWA / mobile app
- No SMS notifications
- No account deletion self-service
- No vendor onboarding guide
- No Google/Apple OAuth login
- UAE PDPL compliance not assessed

---

## Part 4: Security Assessment

### OWASP API Security Top 10

| # | Risk | Status |
|---|------|:---:|
| API1 | Broken Object Level Authorization | ⚠️ Needs IDOR verification |
| API2 | Broken Authentication | ✅ JWT + refresh rotation correct |
| API3 | Broken Object Property Level Authorization | ✅ ValidationPipe whitelist |
| API4 | Unrestricted Resource Consumption | ✅ Global throttle + per-endpoint limits |
| API5 | Broken Function Level Authorization | ✅ Role guards at class level |
| API6 | Unrestricted Access to Business Logic | ⚠️ Booking suspended property |
| API7 | Server-Side Request Forgery | ✅ No user-supplied URLs in server requests |
| API8 | Security Misconfiguration | ⚠️ Swagger, CORS, X-Correlation-Id |
| API9 | Improper Inventory Management | ✅ All routes documented |
| API10 | Unsafe Consumption of APIs | ✅ Stripe webhook signature verified |

### Dependency Vulnerabilities

```
pnpm audit (2026-05-23):
- Total: 45 vulnerabilities
- HIGH: 17
- MODERATE: 23
- LOW: 5

Notable HIGH: multer ^2.0.2 — DoS via crafted multipart (CVE series)
```

**Fix:** `pnpm audit --fix` + manual upgrade `multer@^2.1.1`

---

## Part 5: Payment Architecture Verdict

**Verdict: Well-built with 4 known gaps.**

✅ Correct:
- Webhook raw body preserved before JSON parsing
- Stripe signature verified before any processing
- Booking confirmation is webhook-only (not client-side)
- Serializable transaction isolation
- Idempotency via `StripeWebhookEvent` unique on `eventId`
- Amount and currency mismatch checks
- Server-side price computation
- Dubai tax all 5 components correctly calculated and snapshotted
- Refund restricted to ADMIN only
- Client secret redacted before DB storage

❌ Gaps:
- Security deposit not itemized in checkout UI (PAY-01)
- Admin refund override unbounded (PAY-04) — P0
- Sync webhook fallback could timeout for slow DB ops (PAY-03)
- No promo code race condition protection (PAY-07)

---

## Part 6: Database Verdict

**Verdict: Good schema design; 7 missing DB-level constraints.**

✅ Correct:
- All money as INT minor units
- AED canonical with display FX
- Double-entry LedgerEntry
- Idempotency keys throughout
- Good indexes on hot query paths
- Soft delete via status enums

❌ Gaps:
- No `checkOut > checkIn` DB constraint
- No `totalAmount > 0` constraint
- No `guests > 0` constraint
- No `rating BETWEEN 1 AND 5` constraint
- `User → Property` cascade delete destroys financial records
- FX rates manual (no automation)
- `PropertyCalendarDay` per-day rows don't scale

---

## Part 7: Testing Verdict

**Verdict: Good unit test coverage; critical E2E test coverage is zero.**

Unit test lines: ~2,873 across 12 backend spec files + 2 Playwright files.

✅ Well-tested:
- Stripe webhook idempotency (786-line payments spec)
- Booking service core flows
- Cancellation policy calculation
- Availability hold and overlap detection

❌ Not tested (P0 tests needed before launch):
1. E2E: search → hold → checkout → Stripe webhook → booking confirmed
2. API: `GET /portal/admin/overview` with CUSTOMER JWT → 403
3. API: `PATCH /vendor/properties/:id` with another vendor's token → 403
4. API: `POST /payments/refund` with CUSTOMER JWT → 403
5. API: `POST /webhooks/stripe` with invalid signature → 400
6. API: `POST /webhooks/stripe` duplicate eventId → 200 idempotent
7. API: booking creation for SUSPENDED property → 400/404
8. API: refund amount > payment amount → 400

---

## Part 8: Deployment Verdict

**Verdict: Functional but fragile. Two configuration risks could cause production downtime.**

| Item | Status |
|------|:---:|
| Railway Docker deployment | ✅ Working |
| Health check at `/api/health` | ✅ |
| Restart on failure (max 3) | ✅ |
| Prisma migrations at startup | ⚠️ Risk: restart loop on failure |
| Multi-stage Docker build | ❌ Missing: full source in image |
| CORS for production domain | ❌ Missing: add to env var |
| Vercel `NEXT_PUBLIC_API_ORIGIN` | ⚠️ Must be set; defaults to localhost |

---

## Part 9: SEO Verdict

**Verdict: Foundation is good; rich result opportunities missed.**

✅ Present:
- Dynamic sitemap (fetches live property slugs)
- robots.txt blocking portals and API
- Dynamic metadata on property pages
- Arabic/English bilingual content

❌ Missing:
- JSON-LD structured data (LodgingBusiness + Offer) → no Google rich snippets
- `hreflang` alternates for en/ar
- Sitemap `lastModified` incorrect (always current time)
- Sitemap limited to 100 properties
- Canonical domain not confirmed (www vs non-www)

---

## Part 10: Competitor Position

**Strong differentiators for UAE market:**
1. DTCM Holiday Home Permit + Ownership Proof verification — most UAE OTA platforms don't verify this
2. Arabic RTL UI — rare among tech-forward operators
3. 15-minute date hold — unique among UAE property booking platforms
4. Automated ops task creation — differentiates from self-service Airbnb
5. Transparent Dubai tax breakdown — beats Airbnb's opaque "service fee"

**Critical gaps vs competition:**
1. No map search (Airbnb, Booking.com both have this)
2. No Apple Pay / Google Pay (widely used in UAE)
3. No guest-to-host direct messaging
4. No social login (Google / Apple)
5. No SMS notifications

---

## Part 11: Recommended Execution Order

### This Week (Before First Real User)

```
1. Add www.rentpropertyuae.com to CORS_ORIGINS in Railway (5 min)
2. Add status: PUBLISHED check in createFromHold() (30 min)
3. Cap refund amountOverride in processRefund() (15 min)
4. Generate correlation ID server-side (15 min)
5. Disable Swagger by default / add auth (30 min)
6. Add @Throttle to /auth/refresh (15 min)
7. Upgrade multer to ^2.1.1 (1 hr)
8. Sanitize storageKey in document download (30 min)
9. Write 8 P0 API tests (4 hrs)
```

### Within 2 Weeks

```
10. IDOR audit — verify all customer endpoints filter by req.user.id
11. Promo code serializable transaction
12. 7 DB check constraints migration
13. Property.slug index migration
14. Multi-stage Dockerfile
15. Prisma migrations to pre-deploy job
16. Automated FX rate refresh
17. Admin action audit log table
```

### Before Marketing Push

```
18. JSON-LD LodgingBusiness on property pages
19. hreflang alternates for en/ar
20. Apple Pay / Google Pay via Stripe
21. Map search on /properties
22. Fix minimumCacheTTL (60 → 86400)
23. Paginate sitemap
24. Google/Apple OAuth login
25. Guest-to-vendor messaging
26. Property-specific cancellation policy display
```

---

## Part 12: Individual Audit Reports Index

| File | Topic | Key Findings |
|------|-------|-------------|
| [01_REPO_AND_ARCHITECTURE_AUDIT.md](01_REPO_AND_ARCHITECTURE_AUDIT.md) | Architecture | Monorepo structure, module inventory |
| [02_PRODUCT_AND_ROLE_FLOW_AUDIT.md](02_PRODUCT_AND_ROLE_FLOW_AUDIT.md) | Product flows | Role flows, booking lifecycle |
| [03_FRONTEND_UI_UX_AUDIT.md](03_FRONTEND_UI_UX_AUDIT.md) | Frontend / UX | Page inventory, accessibility, i18n |
| [04_BACKEND_API_AUDIT.md](04_BACKEND_API_AUDIT.md) | API | CORS bug, rate limits, Swagger |
| [05_DATABASE_AND_DATA_MODEL_AUDIT.md](05_DATABASE_AND_DATA_MODEL_AUDIT.md) | Database | Schema, constraints, indexes, cascades |
| [06_AUTH_RBAC_SECURITY_AUDIT.md](06_AUTH_RBAC_SECURITY_AUDIT.md) | Auth / Security | JWT, RBAC, OWASP, 45 CVEs |
| [07_STRIPE_PAYMENT_BOOKING_AUDIT.md](07_STRIPE_PAYMENT_BOOKING_AUDIT.md) | Payments | Full payment flow, 4 gaps |
| [08_CLOUDINARY_MEDIA_UPLOAD_AUDIT.md](08_CLOUDINARY_MEDIA_UPLOAD_AUDIT.md) | Media | Upload paths, unsigned upload risk |
| [09_VENDOR_PORTAL_AUDIT.md](09_VENDOR_PORTAL_AUDIT.md) | Vendor | Portal pages, wizard, financials |
| [10_ADMIN_PORTAL_AUDIT.md](10_ADMIN_PORTAL_AUDIT.md) | Admin | Admin workflows, missing audit log |
| [11_CUSTOMER_PORTAL_AUDIT.md](11_CUSTOMER_PORTAL_AUDIT.md) | Customer | Portal pages, IDOR, profile |
| [12_BUSINESS_LOGIC_AUDIT.md](12_BUSINESS_LOGIC_AUDIT.md) | Business Logic | Promo, pricing, cancellation, tax |
| [13_TESTING_QA_AUDIT.md](13_TESTING_QA_AUDIT.md) | Testing | 2873 unit test lines, 0 E2E critical path tests |
| [14_PERFORMANCE_SEO_DEPLOYMENT_AUDIT.md](14_PERFORMANCE_SEO_DEPLOYMENT_AUDIT.md) | Perf / SEO / Deploy | Dockerfile, SEO gaps, image cache |
| [15_COMPETITOR_GAP_ANALYSIS.md](15_COMPETITOR_GAP_ANALYSIS.md) | Competition | vs Airbnb, Booking.com, Frank Porter |
| [16_FINAL_RISK_REGISTER.md](16_FINAL_RISK_REGISTER.md) | Risks | 35 risks with likelihood × impact scores |
| [17_FINAL_UPGRADE_ROADMAP.md](17_FINAL_UPGRADE_ROADMAP.md) | Roadmap | Phase 0/1/2/3 task list |
| [18_ACTIONABLE_FIX_BACKLOG.md](18_ACTIONABLE_FIX_BACKLOG.md) | Fix Backlog | Developer-ready tickets with exact file/line |

---

*End of Master Audit Report — RentPropertyUAE / Laugh & Lodge — 2026-05-23*
