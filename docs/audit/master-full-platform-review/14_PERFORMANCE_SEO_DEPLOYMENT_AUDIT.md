# 14 — Performance, SEO & Deployment Audit

**Audit date:** 2026-05-23  
**Frontend:** Next.js 16.1.5 on Vercel  
**Backend:** NestJS 11 on Railway (Dockerfile)  
**Database:** Neon PostgreSQL (serverless)

---

## 1. Frontend Performance

### Code Splitting & Dynamic Imports

```typescript
// apps/web/src/app/(site)/page.tsx
const FeaturedSpotlight = dynamic(() => import(...))
const AreasSlider = dynamic(() => import(...))
const PartnerDistributionStrip = dynamic(() => import(...))
const WhyChooseUs = dynamic(() => import(...))
const OwnerCta = dynamic(() => import(...))
const TrustOperationsSection = dynamic(() => import(...))
const HowItWorks = dynamic(() => import(...))
const ServicesPreview = dynamic(() => import(...))
const FaqSection = dynamic(() => import(...))
```

**Assessment:** ✅ Homepage defers all below-the-fold sections via `dynamic()`. Critical path HTML loads fast.

Property page also defers:
- `PublicPropertyCalendar` — heavy calendar component
- `GoogleMap` — third-party map

**Assessment:** ✅ Heavy components are lazy-loaded with skeleton placeholders.

### Bundle Analyzer

Bundle analyzer is configured but opt-in:

```typescript
// next.config.ts
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
```

**Issue PERF-01:** Bundle analyzer is not run in CI. Large bundle regressions can go unnoticed. Add `ANALYZE=true pnpm build` step in CI with size threshold check.

### Image Optimization

```typescript
// next.config.ts
images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 60,   // 60 seconds — too low for property images
  qualities: [75, 90, 92, 100],
}
```

**Issue PERF-02:** `minimumCacheTTL: 60` (60 seconds) is very short for property images. Vercel image optimization will re-process images every minute, adding latency and cost. Increase to `86400` (24h) or `604800` (7 days) for property images.

**Issue PERF-03:** `images.unsplash.com` and `images.pexels.com` are in `remotePatterns`. Stock photo platforms should not be used in production listings — these are likely placeholder/seed images. Ensure production data uses Cloudinary only.

### React 19 / Next.js 16 Considerations

React 19 Server Components are used where applicable (async `page.tsx` files that `await` data). Client components are marked `"use client"`.

**Assessment:** ✅ Reasonable Server/Client component boundary.

---

## 2. Backend Performance

### Database Query Performance

| Table | Assessment |
|-------|-----------|
| Booking | Good indexes on `(propertyId, status, checkIn, checkOut)` and `(customerId)` |
| Property | Missing btree index on `slug` — slug lookups on every property page view do a sequential scan |
| PropertyHold | Index on `(propertyId, status, checkIn, checkOut, expiresAt)` — ✅ |
| BookingBlockedDate | Unique index on `(propertyId, date)` — ✅ |
| NotificationEvent | Index on `(status, nextAttemptAt)` — ✅ |

**Issue PERF-04:** `Property.slug` has no explicit btree index. Every `GET /search/properties/:slug` (the most frequently called public endpoint) does a full scan on `slug` via Prisma `findUnique`. Add index.

### Neon PostgreSQL (Serverless)

**Issue PERF-05:** Neon PostgreSQL uses connection pooling via Neon's serverless driver. Cold start connection latency can be 100-300ms for the first query after inactivity. This affects P99 latency on low-traffic hours. Add connection pooling via PgBouncer (Neon's built-in) or `@neondatabase/serverless` with `neonConfig.fetchConnectionCache = true`.

### Analytics Queries

Admin and vendor analytics queries scan all bookings filtered by date range. At 10k+ bookings these will slow.

**Issue PERF-06:** No query caching on portal overview/analytics endpoints. Add Redis cache (TTL 5 minutes) for admin overview stats.

---

## 3. SEO Assessment

### Sitemap

```typescript
// apps/web/src/app/sitemap.ts
// Fetches up to 100 live property slugs from API
// Static pages: /, /properties, /services, /owners, /gallery, /pricing, /contact, /about, /blog, /privacy, /terms, /cancellation, /refunds
// Dynamic: /properties/:slug, /blog/:slug, /gallery/:slug
// Revalidates: every 1800 seconds (30 min)
```

**Assessment:** ✅ Dynamic sitemap is excellent for SEO. 30-minute revalidation is appropriate.

**Issue SEO-01:** Sitemap uses `https://rentpropertyuae.com` (without `www`). If production redirects `rentpropertyuae.com` → `www.rentpropertyuae.com`, the canonical URL in sitemap must match. Verify canonical domain consistency.

**Issue SEO-02:** Sitemap `lastModified` is `new Date()` (current time) for all URLs. Search engines may ignore the signal if it changes every regeneration. Use actual `updatedAt` from property/blog records.

**Issue SEO-03:** Sitemap fetches only `pageSize=100` properties. If there are more than 100 properties, they are excluded from the sitemap.

### Robots.txt

```typescript
// robots.ts
disallow: ["/api/", "/admin", "/vendor", "/account"]
```

**Assessment:** ✅ Portals and API are correctly blocked from crawlers.

**Issue SEO-04:** `disallow: "/api/"` uses relative path format. Some crawlers may not interpret this correctly without a trailing wildcard. Use `disallow: "/api/*"` for clarity.

### Meta Tags / Open Graph

Property page uses `generateMetadata()` with:
- Title from property title
- Description from property description
- OpenGraph images

**Assessment:** ✅ Dynamic metadata is present. Needs verification that OG image URL is absolute (required by Facebook/Twitter crawlers).

### Structured Data (Schema.org)

`schema.org` structured data was inferred from the property page (`schemaFallback` copy). Whether `Product`, `LodgingBusiness`, or `Offer` schema is actually emitted as JSON-LD needs verification.

**Issue SEO-05:** If structured data is not present, Google cannot show rich snippets (star ratings, price) in search results. Implement `LodgingBusiness` JSON-LD on property pages.

### i18n SEO

Both English and Arabic are supported via `next-intl`. Whether `hreflang` alternate tags are emitted is UNKNOWN.

**Issue SEO-06:** Missing `hreflang` alternate links between `/en` and `/ar` versions. Search engines will index both as separate pages instead of alternates.

---

## 4. Deployment Architecture

### Backend (Railway)

```toml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "pnpm --filter api start:prod"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

```dockerfile
# Dockerfile
FROM node:22
RUN npm install -g pnpm@10.28.2
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build
EXPOSE 10000
CMD ["pnpm", "--filter", "api", "start:prod"]
```

**Assessment:**

| Check | Status | Issue |
|-------|--------|-------|
| Base image | `node:22` (full image) | ⚠️ Use `node:22-alpine` to reduce image size |
| Multi-stage build | None | ⚠️ Full source code + dev dependencies included in production image |
| COPY entire repo | All files copied | ⚠️ Source code, test files, docs in production image |
| Prisma migrations on startup | `prisma migrate deploy` in `start:prod` | ⚠️ Failed migration = container restart loop |
| Healthcheck timeout | 300s | ✅ Sufficient for cold start |
| Restart policy | ON_FAILURE, max 3 | ✅ |

**Issue DEPLOY-01:** Dockerfile does not use multi-stage build. The production image contains full source code, `node_modules` (including devDependencies), test files, and `.env.example` files. Use multi-stage build to ship only the `dist/` folder.

**Issue DEPLOY-02:** `prisma migrate deploy` runs on every container start. If a migration fails mid-deploy, Railway will restart the container up to 3 times, each running the failed migration. This can corrupt partial migrations.

**Issue DEPLOY-03:** No `.dockerignore` verification. If `apps/web`, `docs/`, or `.git` is copied into the Railway image, build times and image size increase significantly.

### Frontend (Vercel)

No `vercel.json` config found. Vercel uses default Next.js detection.

**Issue DEPLOY-04:** No explicit Vercel configuration (`vercel.json`). Production-specific settings (redirects, headers, edge functions) cannot be verified.

**Issue DEPLOY-05:** `NEXT_PUBLIC_API_ORIGIN` must be set correctly in Vercel environment. If not set, falls back to `http://localhost:3001` — all API calls would fail silently.

### Environment Variables

| Variable | Platform | Risk |
|----------|---------|------|
| `NEXT_PUBLIC_API_ORIGIN` | Vercel | Must match Railway URL |
| `DATABASE_URL` | Railway | Neon connection string |
| `STRIPE_SECRET_KEY` | Railway | Live key required for production |
| `STRIPE_WEBHOOK_SECRET` | Railway | Must match live endpoint |
| `JWT_ACCESS_SECRET` | Railway | 32+ chars enforced |
| `CORS_ORIGINS` | Railway | Must include `https://www.rentpropertyuae.com` |
| `CLOUDINARY_*` | Railway | Required for production uploads |

---

## 5. Deployment Issues Summary

### P0 — Launch Blockers

| ID | Issue | Fix |
|----|-------|-----|
| DEPLOY-02 | Prisma migration failure causes container restart loop | Run migrations as a separate Railway job, not in container startup |
| DEPLOY-05 | `NEXT_PUBLIC_API_ORIGIN` not set → all API calls fail | Verify env var is set in Vercel; add deployment smoke test |

### P1 — High Priority

| ID | Issue | Fix |
|----|-------|-----|
| DEPLOY-01 | Non-multi-stage Dockerfile — source code + devDeps in production | Refactor to multi-stage: `builder` + `runner` stages |
| PERF-04 | Missing slug index on Property table | Add `@@index([slug])` in schema.prisma |

### P2 — Medium Priority

| ID | Issue | Fix |
|----|-------|-----|
| PERF-02 | `minimumCacheTTL: 60` — Vercel re-processes images every minute | Increase to `86400` (24h) for property photos |
| PERF-05 | Neon cold start latency | Enable connection pooling via Neon built-in PgBouncer |
| PERF-06 | No caching on analytics queries | Add Redis TTL 5min cache for overview stats |
| SEO-01 | Canonical domain not consistent (www vs non-www) | Enforce one canonical, update sitemap and CORS |
| SEO-02 | Sitemap `lastModified` always current time | Use `property.updatedAt` for property URLs |
| SEO-03 | Sitemap limited to 100 properties | Paginate sitemap or use sitemap index |
| SEO-05 | No JSON-LD structured data on property pages | Add `LodgingBusiness` + `Offer` schema |
| SEO-06 | No `hreflang` for en/ar alternates | Add `alternates.languages` in `generateMetadata()` |
| DEPLOY-03 | No `.dockerignore` verification | Add `.dockerignore` excluding `/docs`, `/apps/web`, test files |

### P3 — Low Priority

| ID | Issue | Fix |
|----|-------|-----|
| PERF-01 | Bundle size not tracked in CI | Add `@next/bundle-analyzer` threshold check in CI |
| PERF-03 | Unsplash/Pexels in `remotePatterns` — placeholder images in production | Remove stock photo domains before public launch |
| SEO-04 | `disallow: "/api/"` without wildcard | Use `disallow: "/api/*"` |
| DEPLOY-04 | No `vercel.json` configuration file | Create with security headers and redirects |
