# 01 — Repository & Architecture Audit

**Audit date:** 2026-05-23
**Branch:** audit/master-full-platform-review
**Auditor role:** Senior Software Architect + Senior Full-Stack Engineer

---

## 1. Repository Structure

```
booking-marketplace/
├── apps/
│   ├── api/          # NestJS backend (Railway)
│   └── web/          # Next.js 16 frontend (Vercel)
├── infra/
│   └── docker/       # docker-compose.yml
├── docs/
├── .github/workflows/ci.yml
├── Dockerfile
├── nixpacks.toml     # Railway nixpacks config
├── railway.toml      # Railway deploy config
├── turbo.json        # Turborepo config
├── pnpm-workspace.yaml
└── pw-smoke.spec.ts  # Playwright smoke test
```

**Package manager:** pnpm 10.28.2  
**Build system:** Turborepo 2.5.0  
**Node version:** v24.15.0  

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Next.js | 16.1.5 |
| Frontend runtime | React | 19.2.3 |
| UI styling | Tailwind CSS | v4 |
| Animation | Framer Motion | 12.29.2 |
| i18n | next-intl | 4.8.3 |
| Backend framework | NestJS | 11.x |
| Database ORM | Prisma | 6.19.2 |
| Database | PostgreSQL (Neon) | — |
| Queue system | BullMQ + Redis | 5.x |
| WebSockets | Socket.io | 4.8.3 |
| Auth | JWT (access + refresh) | — |
| Payment gateway | Stripe | 20.4.1 (SDK) |
| Media upload | Cloudinary | 2.9.0 |
| Email | Resend | 6.10.0 |
| Deployment (frontend) | Vercel | — |
| Deployment (backend) | Railway (Dockerfile) | — |

---

## 3. Architecture Overview

### API Style
REST API with `Global prefix /api`. Swagger available at `/docs` (disabled in production by default unless `SWAGGER_ENABLED=true`).

### Authentication Flow
- Registration/login returns `accessToken` (Bearer) in response body + sets `refreshToken` in HttpOnly cookie (`SameSite=None;Secure` in production)
- Access token expiry: 40 minutes (configurable via `JWT_ACCESS_EXPIRES_IN`)
- Refresh token: 30 days, stored hashed in DB
- Token rotation on refresh

### API Proxy (Next.js → NestJS)
All `/api/*` requests from the frontend (except `/api/auth/me` and `/api/public/fx-rates`) are proxied to the Railway backend via `next.config.ts` rewrites. The `/uploads/*` path is also proxied.

---

## 4. Architecture Diagram (Mermaid)

```mermaid
flowchart TD
    Browser["Browser / Mobile\n(Next.js SSR + Client)"]
    Vercel["Vercel Edge\n(Next.js 16)"]
    Railway["Railway\n(NestJS 11)"]
    Neon["Neon PostgreSQL\n(Prisma ORM)"]
    Redis["Redis\n(BullMQ queues)"]
    Stripe["Stripe\n(Payment Intent / Webhook)"]
    Cloudinary["Cloudinary\n(Image/Media CDN)"]
    Resend["Resend\n(Transactional Email)"]

    Browser -->|SSR / RSC hydration| Vercel
    Browser -->|API calls via rewrites| Vercel
    Vercel -->|"/api/* proxy"| Railway
    Railway -->|Prisma queries| Neon
    Railway -->|Queue jobs| Redis
    Railway -->|createPaymentIntent| Stripe
    Stripe -->|checkout.session.completed\n(raw body, signature verified)| Railway
    Railway -->|Direct browser upload (signed)| Cloudinary
    Railway -->|Notification events| Resend
    
    subgraph Portals
        CustomerPortal["/account/* (Customer)"]
        VendorPortal["/vendor/* (Vendor)"]
        AdminPortal["/admin/* (Admin)"]
    end

    Vercel --- Portals
    Portals --> Railway
```

---

## 5. Module Inventory

### Backend Modules (NestJS)

| Module | Path | Purpose |
|--------|------|---------|
| AuthModule | `src/auth/` | JWT auth, register, login, refresh, password reset |
| VendorModule | `src/vendor/` | Vendor profile, property CRUD |
| AdminModule | `src/admin/` | Admin-only controllers (pricing, properties, vendors, reviews) |
| PortalModule | `src/portal/` | Admin/vendor/user portal APIs |
| BookingsModule | `src/bookings/` | Booking creation (from hold), cancellation |
| PaymentsModule | `src/modules/payments/` | Stripe intent, webhook, refund, activation |
| AvailabilityModule | `src/modules/availability/` | Hold, quote, calendar |
| SearchModule | `src/modules/search/` | Property search/filter |
| NotificationsModule | `src/modules/notifications/` | Email + SSE notification dispatch |
| MessagingModule | `src/modules/messaging/` | WebSocket messaging (admin ↔ vendor/customer) |
| FxModule | `src/modules/fx/` | Currency exchange rates |
| PricingModule | `src/modules/pricing/` | Pricing rules (seasonal/weekend/holiday) |
| PromoModule | `src/modules/promo/` | Promo code validation |
| WishlistModule | `src/modules/wishlist/` | Customer wishlist |
| ReviewsModule | `src/modules/reviews/` | Guest reviews + host responses |
| CustomerModule | `src/modules/customer/` | Customer profile, documents |
| FinanceModule | `src/modules/finance/` | Vendor statements + ledger |
| MediaModule | `src/modules/media/` | Direct-upload signature endpoint |
| ContactModule | `src/modules/contact/` | Contact form submissions |
| OperatorModule | `src/modules/operator/` | Ops tasks, maintenance, service plans |

### Background Workers

| Worker | Schedule | Purpose |
|--------|----------|---------|
| BookingExpiryWorker | Cron | Expire unpaid bookings, release holds |
| BookingCompletionWorker | Cron | Mark past bookings as COMPLETED |
| RefundAutoProcessorWorker | Cron | Auto-process pending refunds |
| AutoPayoutWorker | Cron | Auto-generate vendor statements/payouts |
| EventOutboxWorker | Cron | Drain domain events to BullMQ queues |

---

## 6. Frontend Pages Inventory

### Public Site (`/`)
- `/` — Homepage
- `/properties` — Property search/listings
- `/properties/[slug]` — Property detail
- `/services` — Service plans
- `/owners` — Vendor landing
- `/gallery` — Gallery
- `/pricing` — Pricing plans
- `/contact` — Contact form
- `/about` — About page
- `/blog` — Blog
- `/cancellation`, `/refunds`, `/privacy`, `/terms`, `/cookies` — Legal

### Auth (`/auth`, `/login`, `/signup`, etc.)
- `/auth` — Auth flow router
- `/login`, `/signup`, `/forgot`, `/forgot-password`, `/reset-password`, `/verify-email`

### Customer Portal (`/account/*`)
- `/account` — Dashboard
- `/account/bookings` — Booking history
- `/account/bookings/[bookingId]` — Booking detail
- `/account/profile` — Profile settings
- `/account/documents` — ID/passport upload
- `/account/wishlist` — Saved properties
- `/account/messages`, `/account/notifications`
- `/account/refunds`, `/account/calendar`

### Vendor Portal (`/vendor/*`)
- `/vendor` — Dashboard
- `/vendor/properties` — Property list
- `/vendor/properties/new` — Create property
- `/vendor/properties/[id]/edit` — Edit property
- `/vendor/bookings`, `/vendor/calendar`, `/vendor/pricing`
- `/vendor/statements`, `/vendor/reviews`, `/vendor/analytics`
- `/vendor/messages`, `/vendor/notifications`
- `/vendor/ops-tasks`, `/vendor/maintenance`, `/vendor/block-requests`

### Admin Portal (`/admin/*`)
- `/admin` — Dashboard
- `/admin/properties`, `/admin/review-queue`, `/admin/vendors`, `/admin/bookings`
- `/admin/payments`, `/admin/refunds`, `/admin/payouts`, `/admin/statements`
- `/admin/reviews`, `/admin/contact-submissions`
- `/admin/customer-documents`, `/admin/ops-tasks`
- `/admin/analytics`, `/admin/block-requests`

---

## 7. Deployment Architecture

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | `apps/web/` |
| Backend | Railway | `Dockerfile` + `railway.toml` |
| Database | Neon PostgreSQL | `DATABASE_URL` env |
| Queue | Redis (Railway) | `REDIS_URL` env |
| Media | Cloudinary | `CLOUDINARY_*` env |
| Email | Resend | `RESEND_API_KEY` env |

**Railway start command:** `pnpm --filter api start:prod` (runs `prisma migrate deploy && node dist/src/main.js`)  
**Health check:** `GET /api/health` (timeout: 300s)  
**Restart policy:** ON_FAILURE, max 3 retries  

---

## 8. Architecture Issues

| Issue | Severity | Evidence | Recommendation |
|-------|----------|---------|----------------|
| Role embedded in JWT access token — role change does not invalidate active tokens for 40 min | P1 | `auth.service.ts:202` — role encoded in JWT payload | Add role to token or use short-lived tokens (10–15 min) |
| CORS allows requests with no Origin header (server-to-server) | P2 | `main.ts:162` — `if (!origin) { callback(null, true) }` | Document this; acceptable but should be noted |
| Swagger enabled in prod if `SWAGGER_ENABLED=true` | P2 | `main.ts:203–217` | Keep disabled; ensure Railway env does not set it |
| Redis is optional — BullMQ falls back to synchronous webhook processing | P2 | `payments.webhooks.controller.ts:38–43` — `@Optional()` | Document fall-back behavior; ensure Redis is always available in prod |
| `rawPayloadJson` stored as String (not JSONB) on Payment | P3 | `schema.prisma:1290` | Use JSONB or truncate to prevent bloat |
| Local `/uploads` directory committed to git | P2 | `apps/api/uploads/` — 30+ image files in repo | Remove from git; use Cloudinary in prod |
| `apps/api/cookies.txt` committed to repo | P1 | Root of api app | Delete this file; could contain session tokens |
