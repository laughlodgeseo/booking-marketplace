# 04 — Backend API Audit

**Audit date:** 2026-05-23  
**Framework:** NestJS 11  
**API prefix:** `/api`  
**Validation:** `ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true })`

---

## 1. API Inventory

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Throttle | Assessment |
|--------|----------|------|---------|------------|
| POST | `/auth/register` | Public | 5/min | ✅ |
| POST | `/auth/login` | Public | 5/min | ✅ |
| POST | `/auth/refresh` | JWT Refresh cookie | **None** | ⚠️ Missing throttle |
| POST | `/auth/logout` | JWT Access | None | ✅ |
| POST | `/auth/request-password-reset` | Public | 3/min | ✅ |
| POST | `/auth/reset-password` | Public | 5/min | ✅ |
| POST | `/auth/request-otp` | JWT Access | 5/min | ✅ |
| GET | `/auth/me` | JWT Access | None | ✅ |

### Payment Routes (`/api/payments`)

| Method | Endpoint | Auth | Role | Assessment |
|--------|----------|------|------|------------|
| POST | `/payments/authorize` | JWT Access | Any | ✅ |
| POST | `/payments/capture` | JWT Access | ADMIN only for non-manual | ✅ |
| POST | `/payments/refund` | JWT Access | ADMIN | ✅ |
| POST | `/webhooks/stripe` | Stripe sig | Public | ✅ |

### Availability Routes (`/api/availability`)

| Method | Endpoint | Auth | Role | Assessment |
|--------|----------|------|------|------------|
| GET | `/availability/:propertyId/quote` | Public | — | Quote calculation |
| POST | `/availability/:propertyId/hold` | JWT Access | — | Creates hold |
| GET | `/availability/:propertyId/calendar` | Public | — | Calendar view |
| PATCH | `/availability/:propertyId/settings` | JWT Access | Vendor | Vendor only |
| PATCH | `/availability/:propertyId/calendar` | JWT Access | Vendor | Vendor only |

### Admin Portal (`/api/portal/admin`)

All admin routes protected: `@UseGuards(JwtAccessGuard, RolesGuard) @Roles(UserRole.ADMIN)` at class level.

| Method | Endpoint Pattern | Purpose |
|--------|----------------|---------|
| GET | `/portal/admin/overview` | Dashboard stats |
| GET/POST | `/portal/admin/properties/*` | Property management |
| GET/POST | `/portal/admin/bookings/*` | Booking management |
| GET/POST | `/portal/admin/refunds/*` | Refund management |
| GET/POST | `/portal/admin/vendors/*` | Vendor management |
| GET/POST | `/portal/admin/reviews/*` | Review moderation |
| GET | `/portal/admin/payouts/*` | Payout overview |
| GET | `/portal/admin/statements/*` | Financial statements |

### Vendor Portal (`/api/portal/vendor`)

All vendor routes protected with JWT Access guard and vendor-ownership enforcement.

### Search (`/api/search`)

| Method | Endpoint | Auth | Assessment |
|--------|----------|------|------------|
| GET | `/search/properties` | Public | ✅ |
| GET | `/search/properties/:slug` | Public | ✅ |

---

## 2. Global Middleware & Security Configuration

| Feature | Status | Evidence |
|---------|--------|---------|
| Helmet (security headers) | ✅ Present | `main.ts:63` — `app.use(helmet())` |
| CORS restricted to allowlist | ✅ Present | `main.ts:158–184` — only Vercel origins |
| Request body size limit (1MB) | ✅ Present | `main.ts:56` — `express.json({ limit: '1mb' })` |
| Global ValidationPipe (whitelist + forbidUnknown) | ✅ Present | `main.ts:189–196` |
| Global throttle (120 req/min) | ✅ Present | `app.module.ts:74` + `AppThrottlerGuard` |
| Correlation ID on every response | ✅ Present | `main.ts:65–91` — `x-correlation-id` header |
| HTTP request logging (JSON structured) | ✅ Present | `main.ts:76–88` — logs method, path, status, duration |
| Static uploads exposed at `/uploads/*` | ✅ Present | `main.ts:136` — `/documents/` blocked |

---

## 3. API Issues

### P0 — Critical

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| API-01 | Swagger docs at `/docs` can be enabled in production via `SWAGGER_ENABLED=true` env | `main.ts:203` | Exposes full API surface including internal endpoints | Require basic auth for Swagger in all environments |

### P1 — High Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| API-02 | `/auth/refresh` has no per-endpoint throttle (only global 120/min) | `auth.controller.ts:148` | Token refresh can be spammed | Add `@Throttle({ default: { limit: 10, ttl: 60_000 } })` |
| API-03 | No audit log for admin actions (property approval/rejection, refund issuance) | No `AdminAuditLog` model in schema | Admin cannot be held accountable for actions | Create `AdminActionLog` table with adminId, action, entityId, timestamp |
| API-04 | No IP-based ban/lockout beyond throttle | Global throttle only | Distributed brute-force attacks not mitigated | Integrate Redis-based IP blocking or use Cloudflare |
| API-05 | Contact form has throttle inherited from global (120/min) — too permissive | `contact.controller.ts` — not viewed but likely default | Spam flood | Add `@Throttle({ default: { limit: 3, ttl: 60_000 } })` |

### P2 — Medium Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| API-06 | No pagination on some list endpoints | UNKNOWN — not all controllers reviewed | Large datasets crash or slow response | Ensure all list endpoints use `page + pageSize` pattern |
| API-07 | `X-Correlation-Id` can be injected by client | `main.ts:68–70` — uses incoming header if present | Header injection for log poisoning | Ignore incoming header; always generate server-side |
| API-08 | `req.ip` logged without Cloudflare proxy trust config | `main.ts:84` — `req.ip` may log proxy IP | Log entries show Railway/Vercel IP instead of real client | Configure `app.set('trust proxy', 1)` if behind proxy |
| API-09 | No Idempotency-Key validation on critical mutation endpoints beyond payments | Idempotency-Key only in payments | Duplicate form submissions | Require Idempotency-Key on booking creation |

---

## 4. Response Format Consistency

NestJS default returns objects as-is. No global response wrapper observed (which is fine — REST standard).

Error format: NestJS default `{ statusCode, message, error }` from `HttpException`. This is acceptable.

**Issue:** Some endpoints may return different error shapes when Prisma throws vs NestJS throws. Recommend a global exception filter for consistent error format.

---

## 5. CORS Policy Assessment

```typescript
const staticAllowedOrigins = new Set([
  'https://rentpropertyuae.vercel.app',
  'http://localhost:3000',
  'http://localhost:3100',
]);
const vercelPreviewPattern = /^https:\/\/rentpropertyuae-[a-z0-9-]+\.vercel\.app$/;
```

**Issues:**
1. Production domain `https://www.rentpropertyuae.com` is NOT in the allowlist. Requests from the production site would fail unless added via `CORS_ORIGINS` env var.
2. Requests without Origin header are allowed — intended for server-to-server but document this.

**Immediate fix required:** Add `https://www.rentpropertyuae.com` to `CORS_ORIGINS` Railway env var.

---

## 6. Rate Limiting Configuration

| Endpoint | Limit | TTL | Assessment |
|----------|-------|-----|------------|
| POST /auth/register | 5 | 60s | ✅ |
| POST /auth/login | 5 | 60s | ✅ |
| POST /auth/request-password-reset | 3 | 60s | ✅ |
| POST /auth/reset-password | 5 | 60s | ✅ |
| POST /auth/refresh | **120 global** | 60s | ⚠️ Too permissive |
| POST /webhooks/stripe | 100 | 60s | ✅ |
| All portal/admin | 60 | 60s | ✅ |
| Global default | 120 | 60s | Acceptable |
