# 11 — Customer Portal Audit

**Audit date:** 2026-05-23  
**Scope:** Customer account portal (`/account/*`) + public booking flow + checkout + payment return

---

## 1. Customer Portal Page Inventory

### Account Portal (`/account/*`)

| Route | Purpose |
|-------|---------|
| `/account` | Account dashboard |
| `/account/profile` | Profile management |
| `/account/bookings` | Booking history |
| `/account/bookings/:bookingId` | Booking detail |
| `/account/calendar` | Customer booking calendar |
| `/account/documents` | Document uploads |
| `/account/documents/:documentId` | Document detail |
| `/account/wishlist` | Saved properties |
| `/account/messages` | Messaging inbox |
| `/account/messages/:threadId` | Thread detail |
| `/account/refunds` | Refund tracking |
| `/account/notifications` | Notification center |

### Authentication Pages

| Route | Purpose |
|-------|---------|
| `/login` | Customer login |
| `/signup` | Customer registration |
| `/verify-email` | Email verification |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset |

### Public Booking Flow

| Route | Purpose |
|-------|---------|
| `/properties` | Property search/browse |
| `/properties/:slug` | Property detail + quote panel |
| `/checkout/:propertyId` | Checkout (hold + booking creation) |
| `/payment/return` | Post-payment return URL |
| `/payment/success` | Payment success page |
| `/payment/failed` | Payment failed page |
| `/payment/cancelled` | Payment cancelled page |

---

## 2. Authentication & Authorization Assessment

### Frontend Guards

```typescript
// apps/web/src/app/(portal)/account/layout.tsx
export default function AccountLayout({ children }) {
  return (
    <RequireAuth redirectTo="/login">
      <RequireRole roles={["CUSTOMER"]} redirectTo="/">
        {children}
      </RequireRole>
    </RequireAuth>
  );
}
```

**Assessment:** ✅ Customer portal is frontend-protected. CUSTOMER role required. Backend endpoints also require JWT.

**Issue CP-01:** The customer API endpoints (e.g., `GET /api/customer/profile`, `GET /api/customer/bookings`) enforce JWT but role guard assessment is UNKNOWN. Whether the customer controller also uses `@Roles(UserRole.CUSTOMER)` at class level needs verification. If not, a vendor JWT could access customer endpoints.

---

## 3. Booking Flow Assessment

### Public Flow

```
/properties → /properties/:slug (quote panel)
  → Hold creation (POST /availability/:propertyId/hold)
  → /checkout/:propertyId?holdId=...&checkIn=...&checkOut=...&guests=...
  → Booking creation (POST /bookings from hold)
  → Stripe Payment Elements
  → Stripe webhook confirmation
  → /payment/return → polls booking status
  → /payment/success or /payment/failed
```

### Checkout Page Data Validation

```typescript
// checkout/[propertyId]/page.tsx
const guestsSafe = Number.isFinite(guestsNum) && guestsNum >= 1 ? guestsNum : 2;
const hasStayDates = /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut);
```

**Assessment:** ✅ Frontend validates guest count and date format. Night calculation uses UTC to avoid DST issues.

**Issue CP-02:** `isDirectBooking = !holdId` — checkout page allows direct booking without a hold (for admin/special flows). Whether this path bypasses double-booking protection needs verification.

### Payment Return Page

`/payment/return` — frontend polls booking status after Stripe redirect. Booking confirmation comes from webhook only (not client success callback).

**Assessment:** ✅ Correct pattern. Client does not trust Stripe redirect as confirmation.

---

## 4. IDOR Risk Assessment

| Endpoint Pattern | Risk | Assessment |
|----------------|------|-----------|
| GET `/account/bookings/:bookingId` | Customer A can access Customer B's booking | UNKNOWN — needs verification that booking is filtered by `customerId` |
| GET `/account/documents/:documentId` | Document IDOR | UNKNOWN |
| GET `/account/messages/:threadId` | Message IDOR | UNKNOWN |

**Issue CP-03 (Critical):** Whether customer API endpoints filter by `customerId === req.user.id` on all GET requests needs explicit verification. If any booking/document/message endpoint uses only the resource ID without ownership check, IDOR is present.

Evidence requirement: Need to read `customer.controller.ts` to verify ownership checks.

---

## 5. Customer Profile Management

```typescript
// customer.service.ts
async getProfile(userId: string) { ... }  // ✅ Scoped to userId
async updateProfile(userId: string, dto) { ... }  // ✅ Scoped to userId
async updateAvatar(userId: string, avatarUrl: string) { ... }  // ✅ Scoped to userId
```

**Assessment:** ✅ Profile operations correctly scoped to authenticated user's ID.

**Issue CP-04:** Phone number update has no format validation beyond `.trim()`. No E.164 format enforcement. Malformed phone numbers could be stored.

---

## 6. Wishlist Assessment

`WishlistItem` model: `userId + propertyId` unique constraint.

**Assessment:** ✅ Wishlist is user-scoped. No IDOR risk if properly implemented (needs verification).

---

## 7. Refund Tracking

`/account/refunds` — customer can view refund status. Customer cannot initiate refunds — admin-only operation.

**Assessment:** ✅ Read-only refund view for customers is correct.

---

## 8. Document Uploads

Customer documents (identity, etc.) stored in `CustomerDocument` model. Admin can view and verify.

**Issue CP-05:** Whether customer document downloads are properly scoped (only the owning customer can download their own documents) is UNKNOWN.

---

## 9. Messaging

`MessageThread` model with `adminId + counterpartyUserId` unique constraint. Customers can message admin only.

**Issue CP-06 (Same as VP-05):** Customer-to-vendor messaging is not present. Guests cannot contact the property host directly. This is a significant UX gap for a hospitality platform.

---

## 10. Email Verification Flow

`/verify-email` page handles email token verification. `User.isEmailVerified` field must be `true` before Stripe PaymentIntent creation.

```typescript
// payments.service.ts:146–158
if (!user.isEmailVerified) throw new ForbiddenException('Email must be verified before payment.')
```

**Assessment:** ✅ Email verification is enforced before payment.

**Issue CP-07:** Whether the verification link expires (time-based token) or can be used multiple times is UNKNOWN. Recommend verifying `EmailVerificationToken.expiresAt` is enforced.

---

## 11. OTP / 2FA

`POST /auth/request-otp` — customers can request OTP. Whether OTP is required for any sensitive action (password change, payment) or purely optional is UNKNOWN.

---

## 12. Customer Portal Issues Summary

### P0 — Launch Blockers

| ID | Issue | Fix |
|----|-------|-----|
| CP-03 | IDOR risk: customer endpoints may not enforce ownership filter | Verify all customer API endpoints filter by `customerId = req.user.id`. Add tests. |

### P1 — High Priority

| ID | Issue | Fix |
|----|-------|-----|
| CP-01 | Customer controller role guard not confirmed | Add `@Roles(UserRole.CUSTOMER)` to all customer-facing API controllers |
| CP-06 | No customer-to-vendor messaging | Add messaging capability or clear documentation that support handles all guest communications |

### P2 — Medium Priority

| ID | Issue | Fix |
|----|-------|-----|
| CP-02 | Direct booking path bypasses hold system | Restrict direct booking to admin only; require holdId for all customer checkout requests |
| CP-04 | Phone number not validated (E.164 format) | Add regex validation: `/^\+?[1-9]\d{7,14}$/` |
| CP-05 | Customer document download ownership UNKNOWN | Verify `customerId === req.user.id` in document download endpoint |
| CP-07 | Email verification token expiry UNKNOWN | Verify token has `expiresAt` and it is checked before accepting verification |

### P3 — Low Priority

| ID | Issue | Fix |
|----|-------|-----|
| CP-08 | No account deletion self-service | Add GDPR-compliant account deletion request flow |
| CP-09 | No booking receipt / invoice download for customer | Generate PDF invoice per booking for customer download |
| CP-10 | Wishlist has no sharing capability | Low priority: shareable wishlist links could increase conversion |
