# 16 — Final Risk Register

**Audit date:** 2026-05-23  
**Format:** Risk ID | Category | Risk | Likelihood | Impact | Severity | Status | Mitigation

Severity = Likelihood × Impact (both on 1-3 scale)

---

## Risk Matrix

| Likelihood | 1 — Unlikely | 2 — Possible | 3 — Likely |
|-----------|:---:|:---:|:---:|
| **3 — Catastrophic** | 3 | 6 | 9 |
| **2 — Significant** | 2 | 4 | 6 |
| **1 — Minor** | 1 | 2 | 3 |

---

## P0 — Critical Risks (Must resolve before real money flows)

| ID | Category | Risk | Likelihood | Impact | Severity | Mitigation |
|----|----------|------|:---:|:---:|:---:|-----------|
| R-01 | Booking | Customer books a SUSPENDED property (hold created before suspension, booking created after) | 2 | 3 | **6** | Add `status: PUBLISHED` check in `createFromHold()` — `bookings.service.ts:99+` |
| R-02 | Financial | Admin issues refund greater than original payment amount (`amountOverride` unbounded) | 2 | 3 | **6** | Add `if (override > payment.amount) throw` in `payments.service.ts:909` |
| R-03 | Security | Swagger docs exposed in production (`SWAGGER_ENABLED=true`) reveals full API surface | 2 | 3 | **6** | Add HTTP Basic Auth on `/docs`; default `SWAGGER_ENABLED=false` in production |
| R-04 | Security | `X-Correlation-Id` header injected by client → log poisoning | 3 | 2 | **6** | Generate correlation IDs server-side only; ignore incoming header value |
| R-05 | Data | Prisma migration fails at Railway startup → container restart loop destroys partial migration | 2 | 3 | **6** | Run migrations as a separate pre-deploy step, not in container `CMD` |
| R-06 | CORS | Production domain `https://www.rentpropertyuae.com` missing from CORS allowlist | 3 | 3 | **9** | Add to `CORS_ORIGINS` Railway env var immediately |
| R-07 | Security | IDOR — customer endpoints may not verify `customerId === req.user.id` for booking/document access | 2 | 3 | **6** | Audit all customer controller endpoints; add ownership filter tests |

---

## P1 — High Risks (Resolve before public launch)

| ID | Category | Risk | Likelihood | Impact | Severity | Mitigation |
|----|----------|------|:---:|:---:|:---:|-----------|
| R-08 | Financial | Promo code concurrent redemption exceeds `usageLimit` (race condition) | 2 | 2 | **4** | Serializable transaction on `findUnique + increment` in `promo.service.ts` |
| R-09 | Financial | FX rates are manual — stale rates cause price display mismatch | 3 | 2 | **6** | Integrate automated FX rate refresh via free API |
| R-10 | Security | 45 npm vulnerabilities (17 HIGH) including `multer ^2.0.2` DoS CVEs | 3 | 2 | **6** | Run `pnpm audit --fix`; upgrade `multer` to `^2.1.1` |
| R-11 | Security | `/auth/refresh` token spam — inherits global 120/min only | 3 | 2 | **6** | Add `@Throttle({ default: { limit: 10, ttl: 60_000 } })` on `/auth/refresh` |
| R-12 | Compliance | No audit log for admin actions (approve property, issue refund, suspend vendor) | 2 | 2 | **4** | Create `AdminActionLog` table with adminId, action, entityId, timestamp |
| R-13 | Data | `User → Property → Booking` cascade delete can destroy financial history | 1 | 3 | **3** | Use soft-delete only; prevent hard deletion of vendors with confirmed bookings |
| R-14 | Security | Admin document download path traversal risk — `storageKey` not sanitized before `path.join()` | 1 | 3 | **3** | Add `path.basename()` or `storageKey.includes('..')` check before file serve |
| R-15 | Operational | No vendor-to-guest messaging — all communication through admin cannot scale | 3 | 2 | **6** | Add `GUEST_VENDOR` message thread type |
| R-16 | Financial | Security deposit authorization release flow UNKNOWN — authorized funds may not be released | 2 | 2 | **4** | Implement auto-release via Stripe after checkout + N days |
| R-17 | Data | No DB constraints: `checkOut > checkIn`, `totalAmount > 0`, `guests > 0`, `rating 1-5` | 2 | 2 | **4** | Add Prisma `@@check` constraints in a new migration |

---

## P2 — Medium Risks (Resolve before scaling)

| ID | Category | Risk | Likelihood | Impact | Severity | Mitigation |
|----|----------|------|:---:|:---:|:---:|-----------|
| R-18 | SEO | Missing JSON-LD structured data → no Google rich snippets | 3 | 1 | **3** | Add `LodgingBusiness` + `Offer` JSON-LD to property pages |
| R-19 | SEO | `hreflang` missing for en/ar — duplicate content penalty risk | 3 | 1 | **3** | Add `alternates.languages` in `generateMetadata()` |
| R-20 | Performance | Non-multi-stage Dockerfile → oversized production image | 3 | 1 | **3** | Refactor to multi-stage build |
| R-21 | Performance | `minimumCacheTTL: 60` → Vercel re-processes all property images every minute | 3 | 1 | **3** | Increase to 86400 (24 hours) |
| R-22 | UX | Property wizard state lost on refresh — vendors lose work | 3 | 1 | **3** | Persist draft to localStorage or DB |
| R-23 | Compliance | Static cancellation/refund policy pages — not property-specific | 2 | 2 | **4** | Link property detail page to its `CancellationPolicyConfig` |
| R-24 | Business | No default cancellation policy if property has no `CancellationPolicyConfig` | 2 | 2 | **4** | Define and enforce a platform default policy |
| R-25 | Business | Overlapping pricing rules — no conflict resolution documented | 2 | 2 | **4** | Add `priority` field; document which rule wins |
| R-26 | Security | Unsigned Cloudinary uploads if only `UPLOAD_PRESET` set without `apiKey/apiSecret` | 2 | 2 | **4** | Require signed uploads in production; validate env vars at startup |
| R-27 | Security | SVG MIME type not blocked on image upload | 2 | 2 | **4** | Add `image/svg+xml` to blocked MIME types |
| R-28 | Operational | AutoPayoutWorker mechanism unclear — manual payout risk | 2 | 2 | **4** | Document and test payout automation; notify vendors on payout status |
| R-29 | Data | `PropertyCalendarDay` — one DB row per day per property → 365 rows/property/year | 2 | 1 | **2** | OK at current scale; plan migration to range-based approach before 500+ properties |

---

## P3 — Low Risks

| ID | Category | Risk | Likelihood | Impact | Severity | Mitigation |
|----|----------|------|:---:|:---:|:---:|-----------|
| R-30 | SEO | Sitemap limited to 100 properties | 1 | 1 | **1** | Paginate sitemap generator |
| R-31 | UX | No Apple Pay / Google Pay → checkout conversion lower | 2 | 1 | **2** | Enable via Stripe Payment Request Button |
| R-32 | UX | No social login (Google/Apple) | 2 | 1 | **2** | Add OAuth strategies |
| R-33 | Compliance | UAE PDPL (Personal Data Protection Law) compliance not assessed | 1 | 2 | **2** | Engage legal counsel for UAE data law compliance review |
| R-34 | Operational | DRAFT properties accumulate with no cleanup policy | 2 | 1 | **2** | Auto-archive DRAFTs older than 30 days with no activity |
| R-35 | Reliability | Neon PostgreSQL cold start latency (100-300ms) affects P99 | 2 | 1 | **2** | Enable Neon connection pooling |

---

## Top 10 Risks by Severity

| Rank | ID | Risk | Severity |
|------|-----|------|:---:|
| 1 | R-06 | CORS missing production domain | **9** |
| 2 | R-01 | Book suspended property | **6** |
| 3 | R-02 | Over-refund | **6** |
| 4 | R-03 | Swagger in production | **6** |
| 5 | R-04 | Log poisoning via correlation header | **6** |
| 6 | R-05 | Migration restart loop | **6** |
| 7 | R-07 | IDOR customer endpoints | **6** |
| 8 | R-09 | Stale FX rates | **6** |
| 9 | R-10 | 17 HIGH npm vulnerabilities | **6** |
| 10 | R-11 | Auth refresh token spam | **6** |
