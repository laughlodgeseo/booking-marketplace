# 06 — Authentication, RBAC & Security Audit

**Audit date:** 2026-05-23  
**Severity system:** P0 = Launch Blocker | P1 = High | P2 = Medium | P3 = Low

---

## 1. Authentication Mechanism

### Token Strategy
- **Access token:** JWT Bearer (40 min expiry, configurable via `JWT_ACCESS_EXPIRES_IN`)
- **Refresh token:** JWT in HttpOnly cookie (`rentpropertyuae_rt`), 30 days, stored hashed in DB
- **Cookie config (production):** `HttpOnly=true, Secure=true, SameSite=None, Path=/`

### Verified Positives
| Check | Status | Evidence |
|-------|--------|---------|
| Passwords hashed with bcrypt | ✅ Present | `auth.service.ts:124` — `hashPassword()` from `common/security/password.ts` |
| Refresh tokens stored as SHA-256 hash in DB | ✅ Present | `auth.service.ts:500–508` — `hashToken(refreshToken)` persisted |
| Password reset tokens stored as hash | ✅ Present | `auth.service.ts:240` — `hashToken(tokenPlain)` |
| Email leaked only via generic error message | ✅ Present | `auth.service.ts:179` — `'Invalid credentials'` for both bad email + bad password |
| Token rotation on refresh | ✅ Present | `auth.service.ts:344–350` — old token revoked, new issued |
| All sessions invalidated on password reset | ✅ Present | `auth.service.ts:293–299` — all RefreshTokens revoked in transaction |
| HttpOnly cookie blocks JS access | ✅ Present | `auth.controller.ts:92` — `httpOnly: true` |
| Registration blocks ADMIN role self-assignment | ✅ Present | `auth.service.ts:127–130` — only CUSTOMER/VENDOR allowed |
| Email verification OTP sent on registration | ✅ Present | `auth.controller.ts:112` — fire-and-forget OTP dispatch |
| Rate limiting on login (5/min) | ✅ Present | `auth.controller.ts:125` — `@Throttle({ default: { limit: 5, ttl: 60_000 } })` |
| Rate limiting on register (5/min) | ✅ Present | `auth.controller.ts:101` — `@Throttle` |
| Rate limiting on password reset (3/min) | ✅ Present | `auth.controller.ts:192` |
| JWT secrets length-validated (≥32 chars) | ✅ Present | `env.validation.ts:28–34` — `requiredJwtSecret()` |
| Placeholder env values rejected | ✅ Present | `env.validation.ts:1–10` — `PLACEHOLDER_VALUES` set |

---

## 2. RBAC (Role-Based Access Control)

### Guards Architecture
- `JwtAccessGuard` — validates JWT access token via `passport-jwt`
- `RolesGuard` — checks `req.user.role` against `@Roles()` decorator
- `AppThrottlerGuard` — global rate limiter (120 req/min default, overridable per-endpoint)

### AdminPortalController Protection
```typescript
// admin-portal.controller.ts:44–46
@Controller('/portal/admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
```
**Assessment:** Admin routes are protected at the class level. ✅ Backend-enforced.

### Vendor Ownership Enforcement
```typescript
// availability.service.ts:82–93
private async assertVendorOwnsPropertyOrThrow(userId: string, propertyId: string) {
  const property = await this.prisma.property.findFirst({
    where: { id: propertyId, vendorId: userId },
  });
  if (!property) throw new ForbiddenException('You do not own this property.');
}
```
**Assessment:** Vendor operations check `vendorId: userId` in DB queries. ✅ IDOR protected.

### Customer IDOR Protection
Payment service checks `booking.customerId !== args.actor.id` before allowing payment access.  
**Assessment:** Customer cannot pay for another customer's booking. ✅

---

## 3. Security Issues

### P1 — High Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| AUTH-01 | Role encoded in JWT access token — role change doesn't take effect for up to 40 min | `auth.service.ts:481` — `role` in `JwtAccessPayload` | Suspended vendor or admin whose access was revoked can operate for 40 min after revocation | Reduce access token TTL to 10–15 min OR invalidate by checking DB role on sensitive operations |
| AUTH-02 | Password is trimmed before verification as "UX aid" — allows bypassing with padded passwords | `auth.service.ts:184–188` — trimmed password fallback | Attacker who learns `" password "` works as `"password"` could potentially reduce brute-force search space | Remove trim-retry; it is not safe UX practice |
| AUTH-03 | No per-IP or per-email lockout after repeated failures — only per-endpoint throttle | `auth.controller.ts:101–131` — throttle limits requests but not accounts | 5 req/min = 7,200 attempts/day per IP | Add account lockout after N failed attempts (5) with cooldown |
| AUTH-04 | `apps/api/cookies.txt` file present in repository | File exists at `apps/api/cookies.txt` | Could contain live session tokens or test credentials | Delete immediately from repo and git history |
| AUTH-05 | Refresh endpoint has no explicit throttle | `auth.controller.ts:148` — no `@Throttle` on `/auth/refresh` | Attacker can spam refresh endpoint | Add `@Throttle({ default: { limit: 10, ttl: 60_000 } })` |

### P2 — Medium Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| AUTH-06 | No CSP (Content-Security-Policy) header | `main.ts` — helmet() default does not include CSP | XSS escalation if injected; no secondary defense | Configure `helmet.contentSecurityPolicy()` |
| AUTH-07 | SameSite=None cookie in production requires that all API calls go over HTTPS | `auth.controller.ts:89` — SameSite=None when isProd | If API deployed without HTTPS, cookies sent to non-origin sites | Ensure Railway backend forces HTTPS in production |
| AUTH-08 | Swagger documentation accessible if `SWAGGER_ENABLED=true` in Railway env vars | `main.ts:203` — `process.env.SWAGGER_ENABLED === 'true'` | Full API surface exposed to public | Remove or protect Swagger with admin auth |
| AUTH-09 | OAuth login does not enforce email verification before granting access (OAuth users get isEmailVerified=true) | `auth.service.ts:425` — `isEmailVerified: true` for OAuth | Minor: OAuth providers guarantee email; acceptable | Acceptable but document the rationale |

---

## 4. OWASP Top 10 Assessment

| OWASP Category | Status | Notes |
|----------------|--------|-------|
| A01 — Broken Access Control | **PARTIAL** | Admin/vendor RBAC enforced; JWT role stale for 40 min |
| A02 — Cryptographic Failures | **PASS** | bcrypt passwords, SHA-256 tokens, HTTPS required |
| A03 — Injection | **PASS** | Prisma ORM parameterized queries; ValidationPipe whitelist |
| A04 — Insecure Design | **PARTIAL** | Role-in-JWT is a design trade-off; holds system OK |
| A05 — Security Misconfiguration | **PARTIAL** | Multer DoS vulnerabilities, cookies.txt in repo |
| A06 — Vulnerable Components | **FAIL** | 45 npm vulnerabilities (17 high) — see dep audit section |
| A07 — Auth Failures | **PARTIAL** | No per-account lockout; refresh not throttled |
| A08 — Software Integrity | **PASS** | pnpm lockfile present; Stripe signature verified |
| A09 — Security Logging | **PARTIAL** | HTTP request logging present; no dedicated audit log model |
| A10 — SSRF | **PASS** | No external URL fetching from user input detected |

---

## 5. Dependency Vulnerabilities

**Total:** 45 vulnerabilities (17 high, 23 moderate, 5 low)

| Package | Severity | CVE/GHSA | Issue | Fix |
|---------|----------|---------|-------|-----|
| multer ^2.0.2 | **HIGH** | GHSA-xf7r-hgr6-v32p | DoS via incomplete cleanup | Upgrade to >=2.1.1 |
| multer ^2.0.2 | **HIGH** | GHSA-v52c-386h-88mc | DoS via resource exhaustion | Upgrade to >=2.1.1 |
| multer ^2.0.2 | **HIGH** | GHSA-5528-5vmv-3xc2 | DoS via uncontrolled recursion | Upgrade to >=2.1.1 |
| next 16.1.5 | **LOW** | GHSA-3g8h-86w9-wvmq | Middleware cache poisoning | Upgrade to >=16.2.5 |
| next 16.1.5 | **LOW** | GHSA-vfv6-92ff-j949 | RSC cache-busting collision | Upgrade to >=16.2.5 |
| path-to-regexp >=8.0.0 | **HIGH** | GHSA transitive | ReDoS via optional groups | Upgrade (transitive via express 5) |
| picomatch (next-intl dep) | **HIGH** | GHSA-c2c7-rcm5-vvqj | ReDoS via extglob | Upgrade (transitive) |
| effect (prisma dep) | **HIGH** | GHSA-38f7-945m-qr2g | AsyncLocalStorage context contamination | Upgrade @prisma/config |

**Action:** `pnpm update multer@^2.1.1 && pnpm update next@^16.2.5 && pnpm audit --fix`

---

## 6. CSRF Assessment

**Risk level: LOW**  
The primary auth mechanism uses JWT Bearer tokens in headers (not cookies alone). POST requests from malicious sites cannot forge the `Authorization: Bearer <token>` header. The refresh token cookie is HttpOnly with `SameSite=None` (requires browser opt-in via CORS).

The CORS policy only allows `rentpropertyuae.vercel.app`, Vercel preview URLs, and localhost. This mitigates cross-origin cookie abuse. No additional CSRF tokens are required for this architecture.

---

## 7. Secrets Management

| Variable | Risk if Exposed | Assessment |
|----------|----------------|------------|
| `JWT_ACCESS_SECRET` | Forge any JWT token | Must be ≥32 chars; validated on startup |
| `JWT_REFRESH_SECRET` | Forge refresh tokens | Must be ≥32 chars; validated on startup |
| `STRIPE_SECRET_KEY` | Create charges, issue refunds | Never exposed to client |
| `STRIPE_WEBHOOK_SECRET` | Skip webhook signature | Used server-side only |
| `CLOUDINARY_API_SECRET` | Unlimited uploads | Server-side only; not in env.example |
| `DATABASE_URL` | Full DB access | Server-side only |

**No secrets detected in committed code.** The `apps/api/cookies.txt` must be reviewed and deleted.
