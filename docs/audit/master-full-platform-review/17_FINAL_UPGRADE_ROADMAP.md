# 17 — Final Upgrade Roadmap

**Audit date:** 2026-05-23  
**Format:** Phased roadmap from launch-blocker fixes through scale readiness

---

## Phase 0 — Pre-Launch Blockers (Do this week, before any real users)

Estimated effort: 2-3 days of focused engineering.

### Security & Correctness

| # | Task | File/Location | Time |
|---|------|--------------|------|
| 0.1 | **CORS**: Add `https://www.rentpropertyuae.com` to `CORS_ORIGINS` Railway env var | `railway.toml` / env | 5 min |
| 0.2 | **Booking**: Add `status: PropertyStatus.PUBLISHED` check in `createFromHold()` | `bookings.service.ts:99+` | 30 min |
| 0.3 | **Refund cap**: Add `if (amountOverride > payment.amount) throw BadRequestException` | `payments.service.ts:909` | 15 min |
| 0.4 | **Correlation ID**: Generate server-side; ignore incoming `X-Correlation-Id` header | `main.ts:68–70` | 15 min |
| 0.5 | **Swagger**: Disable by default in production; add Basic Auth guard if needed | `main.ts:203` | 30 min |
| 0.6 | **npm audit**: Run `pnpm audit --fix`; force-upgrade `multer` to `^2.1.1` | `apps/api/package.json` | 1 hr |
| 0.7 | **Auth refresh throttle**: Add `@Throttle({ default: { limit: 10, ttl: 60_000 } })` to `/auth/refresh` | `auth.controller.ts:148` | 15 min |
| 0.8 | **Document download**: Sanitize `storageKey` — reject paths containing `..` | `admin-portal.controller.ts` | 30 min |

### Test Coverage for Launch Blockers

| # | Test | Tool |
|---|------|------|
| T0.1 | `POST /bookings` for SUSPENDED property → 400 | Supertest |
| T0.2 | `POST /payments/refund` with `amountOverride > paid` → 400 | Jest |
| T0.3 | `GET /portal/admin/overview` with CUSTOMER JWT → 403 | Supertest |
| T0.4 | `PATCH /vendor/properties/:id` with another vendor's token → 403 | Supertest |
| T0.5 | `POST /webhooks/stripe` with invalid signature → 400 | Jest |
| T0.6 | `POST /webhooks/stripe` duplicate eventId → 200 idempotent | Jest |

---

## Phase 1 — High Priority Hardening (Within 2 weeks of launch)

### Security

| # | Task | Location | Time |
|---|------|---------|------|
| 1.1 | IDOR audit: verify all customer endpoints filter by `req.user.id` | `customer.controller.ts`, `user-portal.service.ts` | 2 hrs |
| 1.2 | Add `@Roles(UserRole.CUSTOMER)` to customer controller (if missing) | `customer.controller.ts` | 30 min |
| 1.3 | Add DB constraints: `checkOut > checkIn`, `totalAmount > 0`, `guests > 0`, `rating BETWEEN 1 AND 5` | `schema.prisma` migration | 2 hrs |
| 1.4 | Block SVG MIME type in `imageFileFilter` | `image-file.filter.ts` | 30 min |
| 1.5 | Enforce signed Cloudinary uploads: validate `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` at startup | `property-media-storage.ts` | 1 hr |

### Financial

| # | Task | Location | Time |
|---|------|---------|------|
| 1.6 | Fix promo code race condition: wrap `findUnique + increment` in serializable transaction | `promo.service.ts` | 1 hr |
| 1.7 | Add automated FX rate refresh via exchangerate-api.com free tier (every 4 hours) | New `fx-rate.scheduler.ts` | 3 hrs |
| 1.8 | Define platform default cancellation policy applied when property has no config | `cancellation.policy.ts` | 1 hr |
| 1.9 | Implement security deposit auto-release via Stripe after checkout + 7 days | `payments.service.ts` | 3 hrs |

### Admin Accountability

| # | Task | Location | Time |
|---|------|---------|------|
| 1.10 | Create `AdminActionLog` table + log all approve/reject/refund/suspend actions | New migration + interceptor | 4 hrs |

### DevOps

| # | Task | Location | Time |
|---|------|---------|------|
| 1.11 | Refactor Dockerfile to multi-stage build: `builder` + `runner` | `Dockerfile` | 2 hrs |
| 1.12 | Move Prisma migrations out of container startup into Railway pre-deploy hook | `railway.toml` | 1 hr |
| 1.13 | Add `Property.slug` btree index | `schema.prisma` migration | 30 min |

---

## Phase 2 — Product Quality (Before marketing/growth push)

### UX / Conversion

| # | Task | Business Value |
|---|------|--------------|
| 2.1 | Add Google / Apple OAuth login (`passport-google-oauth20`, `passport-apple`) | -30% registration drop-off |
| 2.2 | Enable Apple Pay / Google Pay via Stripe Payment Request Button | +15% mobile conversion |
| 2.3 | Add map view on `/properties` page (Google Maps / Mapbox) | UAE users expect map search |
| 2.4 | Persist property wizard draft to localStorage (survives page refresh) | Reduce vendor frustration |
| 2.5 | Add guest-to-vendor direct messaging | Required for hospitality UX at scale |
| 2.6 | Property-specific cancellation policy display on property detail page | Clear policy = higher trust |

### SEO

| # | Task | Business Value |
|---|------|--------------|
| 2.7 | Add `LodgingBusiness` + `Offer` JSON-LD to property pages | Google rich snippets (stars, price) |
| 2.8 | Add `hreflang` alternates for en/ar in `generateMetadata()` | Prevents duplicate content penalty |
| 2.9 | Increase `minimumCacheTTL` to 86400 in next.config.ts | Vercel cost reduction + faster images |
| 2.10 | Fix sitemap `lastModified` to use `property.updatedAt` | Better crawl signals |
| 2.11 | Paginate sitemap for > 100 properties | SEO visibility for full inventory |

### Performance

| # | Task | Business Value |
|---|------|--------------|
| 2.12 | Add Redis TTL 5min cache on admin/vendor overview stats | Prevents slow dashboard at scale |
| 2.13 | Enable Neon PgBouncer connection pooling | Reduces cold-start latency |
| 2.14 | Add bundle size check in CI (`ANALYZE=true pnpm build`) | Prevent bundle regressions |

### Notifications

| # | Task | Business Value |
|---|------|--------------|
| 2.15 | Add SMS channel via Twilio for booking confirmations and check-in reminders | Industry standard in UAE |
| 2.16 | Add push notifications (Firebase FCM or web push) | Re-engagement for mobile users |

---

## Phase 3 — Scale & Compliance (Before reaching 1,000 active bookings/month)

### Financial Integrity

| # | Task |
|---|------|
| 3.1 | Monthly ledger reconciliation cron: verify `SUM(credits) - SUM(debits) = SUM(payouts)` per vendor |
| 3.2 | Configurable tax rates in admin settings table (vs hardcoded `dubai-tax.config.ts`) |
| 3.3 | Pricing rule conflict resolution — add `priority` field or document first-match behavior |
| 3.4 | Integrate Tabby or Tamara BNPL for UAE market |

### Platform Operations

| # | Task |
|---|------|
| 3.5 | DTCM reporting API integration (if required by UAE law for platforms) |
| 3.6 | UAE PDPL (Personal Data Protection Law) compliance review |
| 3.7 | GDPR-aligned account deletion self-service for customers |
| 3.8 | Bulk admin actions on review queue |
| 3.9 | Auto-archive DRAFT properties inactive > 30 days |

### Data & Reliability

| # | Task |
|---|------|
| 3.10 | Migrate `PropertyCalendarDay` from per-day rows to range-based blocked dates |
| 3.11 | Analytics materialized views or data warehouse for historical reporting |
| 3.12 | Load testing: 50 concurrent hold requests for same property (verify no double booking) |
| 3.13 | Load testing: 50 concurrent promo code redemptions (verify usage cap) |

### Mobile

| # | Task |
|---|------|
| 3.14 | Add PWA manifest + service worker (`next-pwa`) for mobile web experience |
| 3.15 | Plan React Native app (6-month initiative) |

---

## Dependency Tree (Critical Path)

```
0.1 (CORS)              → unblock production traffic immediately
0.2 (booking guard)     → 0.5 tests
0.3 (refund cap)        → T0.2 test
1.11 (Dockerfile)       → 1.12 (migrations)
1.7 (FX refresh)        → 2.12 (caching)
2.5 (guest-vendor msg)  → phase 3 (scale)
2.7 (JSON-LD)           → organic SEO traffic (6 months)
```
