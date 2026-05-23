# 18 — Actionable Fix Backlog

**Audit date:** 2026-05-23  
**Format:** Developer-ready tickets. Each entry has: exact file, line, change required, acceptance criteria.

---

## P0 — Do Before Any Real User Touches This System

---

### FIX-001: Add production domain to CORS allowlist

**Category:** Security / CORS  
**File:** Railway environment variables (`CORS_ORIGINS`)  
**Risk if unfixed:** All API calls from `https://www.rentpropertyuae.com` fail with CORS error  

**Change:**
```
# In Railway environment variables panel, append to CORS_ORIGINS:
https://www.rentpropertyuae.com
```

**Acceptance criteria:** `OPTIONS` preflight from `https://www.rentpropertyuae.com` returns `200` with `Access-Control-Allow-Origin: https://www.rentpropertyuae.com`.

---

### FIX-002: Verify PUBLISHED status at booking creation

**Category:** Business Logic / Booking  
**File:** `apps/api/src/bookings/bookings.service.ts` (near line 99)  
**Risk if unfixed:** Customers can create bookings for SUSPENDED/ARCHIVED properties  

**Change:**
```typescript
// In createFromHold(), when fetching the property:
const property = await this.prisma.property.findUniqueOrThrow({
  where: {
    id: propertyId,
    status: PropertyStatus.PUBLISHED,  // ADD THIS
  },
});
// If property is not PUBLISHED, Prisma throws → 404 response
```

**Acceptance criteria:** `POST /bookings` for a SUSPENDED property returns `404` or `400`. Test: seed a SUSPENDED property, attempt booking, assert non-2xx response.

---

### FIX-003: Cap admin refund amount override

**Category:** Financial / Refunds  
**File:** `apps/api/src/modules/payments/payments.service.ts` (line ~909)  
**Risk if unfixed:** Admin can issue refund greater than original payment amount  

**Change:**
```typescript
// In processRefund(), before calling Stripe:
if (amountOverride !== undefined && amountOverride > payment.amount) {
  throw new BadRequestException(
    `Refund amount (${amountOverride}) cannot exceed original payment (${payment.amount}).`,
  );
}
```

**Acceptance criteria:** `POST /payments/refund` with `amountOverride` > `payment.amount` returns `400`. Test: create payment for 10000, attempt refund for 15000, assert 400.

---

### FIX-004: Generate Correlation-ID server-side only

**Category:** Security / Log Poisoning  
**File:** `apps/api/src/main.ts` (lines 68–70)  
**Risk if unfixed:** Client can inject arbitrary `X-Correlation-Id` values into logs  

**Change:**
```typescript
// Replace:
const correlationId = req.headers['x-correlation-id'] || uuidv4();
// With:
const correlationId = uuidv4(); // Always generate; never trust client header
```

**Acceptance criteria:** Request with header `X-Correlation-Id: injected-value` receives a new server-generated UUID in response, not `injected-value`. Verify in logs.

---

### FIX-005: Disable Swagger by default in production

**Category:** Security / Information Disclosure  
**File:** `apps/api/src/main.ts` (line ~203)  
**Risk if unfixed:** Full API schema exposed in production with `SWAGGER_ENABLED=true`  

**Change:**
```typescript
// Replace plain env check with auth-gated check:
if (configService.get('SWAGGER_ENABLED') === 'true') {
  const config = new DocumentBuilder().setTitle('API').build();
  const document = SwaggerModule.createDocument(app, config);
  // Add HTTP Basic Auth middleware on /docs
  app.use('/docs', (req, res, next) => {
    const auth = req.headers.authorization;
    const expected = 'Basic ' + Buffer.from(
      `${process.env.SWAGGER_USER}:${process.env.SWAGGER_PASS}`
    ).toString('base64');
    if (auth !== expected) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Docs"');
      return res.status(401).end('Unauthorized');
    }
    next();
  });
  SwaggerModule.setup('docs', app, document);
}
```

**Acceptance criteria:** In production (`NODE_ENV=production`), `/docs` returns `401` without credentials. With `SWAGGER_USER`/`SWAGGER_PASS` credentials, returns `200`.

---

### FIX-006: Add throttle to /auth/refresh

**Category:** Security / Rate Limiting  
**File:** `apps/api/src/auth/auth.controller.ts` (line ~148)  
**Risk if unfixed:** Refresh token endpoint can be spammed at 120 req/min (global limit)  

**Change:**
```typescript
@Post('refresh')
@Throttle({ default: { limit: 10, ttl: 60_000 } })  // ADD THIS
@HttpCode(HttpStatus.OK)
async refresh(@Req() req: Request) { ... }
```

**Acceptance criteria:** 11th refresh request within 60 seconds returns `429 Too Many Requests`.

---

### FIX-007: Upgrade multer to patch DoS CVEs

**Category:** Security / Dependencies  
**File:** `apps/api/package.json`  
**Risk if unfixed:** multer `^2.0.2` has HIGH severity DoS CVEs  

**Change:**
```bash
pnpm --filter api add multer@^2.1.1
pnpm audit --prod
```

**Acceptance criteria:** `pnpm audit --prod` shows 0 HIGH severity findings for multer.

---

### FIX-008: Sanitize document download path

**Category:** Security / Path Traversal  
**File:** `apps/api/src/portal/admin/admin-portal.controller.ts`  
**Risk if unfixed:** Malicious `storageKey` in DB could read arbitrary files  

**Change:**
```typescript
// Before path.join():
const safeKey = path.basename(storageKey); // Strips any ../ components
if (safeKey !== storageKey) {
  throw new BadRequestException('Invalid document path.');
}
const docPath = path.join(BOOKING_DOCUMENTS_DIR, safeKey);
```

**Acceptance criteria:** Request with `storageKey` containing `../../etc/passwd` returns `400`.

---

## P1 — Resolve Within 2 Weeks of Launch

---

### FIX-009: Fix promo code race condition

**Category:** Financial / Race Condition  
**File:** `apps/api/src/modules/promo/promo.service.ts`  

**Change:** Replace non-atomic `findUnique + update` with conditional update:
```typescript
// Instead of: check currentUsage, then increment
// Use atomic conditional update:
const updated = await this.prisma.promoCode.updateMany({
  where: {
    id: promo.id,
    currentUsage: { lt: promo.usageLimit },  // Atomic check + update
  },
  data: { currentUsage: { increment: 1 } },
});
if (updated.count === 0) {
  throw new BadRequestException('Promo code usage limit reached.');
}
```

**Acceptance criteria:** 50 concurrent promo redemptions for a code with `usageLimit: 10` result in exactly 10 successful redemptions.

---

### FIX-010: Add DB-level check constraints

**Category:** Data Integrity  
**File:** `apps/api/prisma/schema.prisma` + new migration  

**Change:** Add the following in a new migration SQL file:
```sql
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_checkOut_after_checkIn" 
  CHECK ("checkOut" > "checkIn");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_totalAmount_positive" 
  CHECK ("totalAmount" > 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guests_positive" 
  CHECK ("guests" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" 
  CHECK ("amount" > 0);
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_rating_range" 
  CHECK ("rating" >= 1 AND "rating" <= 5);
```

**Acceptance criteria:** Attempting to insert a Booking with `checkOut <= checkIn` throws a DB constraint violation.

---

### FIX-011: Add Property.slug index

**Category:** Performance  
**File:** `apps/api/prisma/schema.prisma`  

**Change:**
```prisma
model Property {
  // ... existing fields ...
  @@index([slug])  // ADD THIS
}
```

**Acceptance criteria:** `EXPLAIN ANALYZE SELECT * FROM "Property" WHERE slug = 'test-slug'` shows Index Scan, not Sequential Scan.

---

### FIX-012: Multi-stage Dockerfile

**Category:** DevOps / Security  
**File:** `Dockerfile`  

**Change:**
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.28.2
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

# Stage 2: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@10.28.2
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --prod --frozen-lockfile
EXPOSE 10000
CMD ["pnpm", "--filter", "api", "start:prod"]
```

**Acceptance criteria:** Production Docker image is < 500MB. Source TypeScript files are not present in final image.

---

### FIX-013: Move Prisma migrations to pre-deploy step

**Category:** DevOps / Reliability  
**File:** `railway.toml` + `apps/api/package.json`  

**Change:**
```toml
# railway.toml
[deploy]
startCommand = "pnpm --filter api start:prod"
# Add pre-deploy job in Railway dashboard:
# Command: pnpm --filter api prisma migrate deploy
```

Also remove `prisma migrate deploy` from `start:prod` script in package.json if it's currently there.

**Acceptance criteria:** Container startup does not run migrations. Railway pre-deploy job runs `prisma migrate deploy` before container switches over.

---

### FIX-014: Automate FX rate refresh

**Category:** Business / Financial  
**File:** New file `apps/api/src/modules/fx-rates/fx-rate.scheduler.ts`  

**Change:** Add a scheduled service:
```typescript
@Injectable()
export class FxRateScheduler {
  @Cron('0 */4 * * *')  // Every 4 hours
  async refreshRates() {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/AED');
    const data = await res.json();
    for (const [currency, rate] of Object.entries(data.rates)) {
      await this.prisma.fxRate.upsert({
        where: { fromCurrency_toCurrency: { fromCurrency: 'AED', toCurrency: currency } },
        create: { fromCurrency: 'AED', toCurrency: currency, rate, provider: 'exchangerate-api' },
        update: { rate, provider: 'exchangerate-api', updatedAt: new Date() },
      });
    }
  }
}
```

**Acceptance criteria:** FX rates update every 4 hours automatically without manual intervention.

---

### FIX-015: Add customer endpoint IDOR protection

**Category:** Security  
**Files:** All customer/user portal controllers  

**Verification steps:**
1. Read `user-portal.service.ts` — verify all `getBooking`, `getDocument`, `getThread` methods filter by `customerId = userId`
2. Test: Authenticate as Customer A, attempt `GET /portal/user/bookings/:bookingIdBelongingToCustomerB` → assert 404 or 403

**Acceptance criteria:** Customer A cannot access Customer B's bookings, documents, or messages.

---

## P2 — Product Quality Backlog

| ID | Task | File | Notes |
|----|------|------|-------|
| FIX-016 | Add Google OAuth (`passport-google-oauth20`) | New `google.strategy.ts` | Add to auth module |
| FIX-017 | Enable Apple Pay / Google Pay via Stripe | `payments.service.ts` — `payment_method_types` | Add `'link'` and wallet types |
| FIX-018 | Add JSON-LD `LodgingBusiness` schema to property pages | `properties/[slug]/page.tsx` | Required for Google rich snippets |
| FIX-019 | Add `hreflang` alternates for en/ar | `layout.tsx` + `generateMetadata()` | Use `alternates.languages` option |
| FIX-020 | Increase `minimumCacheTTL` to 86400 | `apps/web/next.config.ts:50` | From `60` to `86400` |
| FIX-021 | Persist wizard draft to localStorage | `PropertyWizard` component | Auto-save after each step |
| FIX-022 | Block SVG MIME type in image upload filter | `apps/api/src/common/upload/image-file.filter.ts` | Add `'image/svg+xml'` to blocked list |
| FIX-023 | Add admin audit log table | `schema.prisma` + migration | Fields: adminId, action, entityId, entityType, notes, createdAt |
| FIX-024 | Add `@@index([slug])` on Property | `schema.prisma` migration | Included in FIX-011 |
| FIX-025 | Fix sitemap `lastModified` to use `property.updatedAt` | `apps/web/src/app/sitemap.ts:54` | Fetch `updatedAt` from API |
| FIX-026 | Paginate sitemap beyond 100 properties | `apps/web/src/app/sitemap.ts:16` | Implement sitemap index + paginated sub-sitemaps |
| FIX-027 | Add Twilio SMS notification channel | New `sms.service.ts` | For booking confirmation + check-in reminders |
| FIX-028 | Add guest-to-vendor message thread type | `MessageThread` model + `GUEST_VENDOR` type | Requires schema migration |
| FIX-029 | Phone number E.164 validation | `customer.service.ts:33` | Add regex validation on `phone` field |
| FIX-030 | Add `trust proxy` setting for real IP logging | `main.ts` | `app.set('trust proxy', 1)` |
