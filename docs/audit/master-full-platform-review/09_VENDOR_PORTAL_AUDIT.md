# 09 — Vendor Portal Audit

**Audit date:** 2026-05-23  
**Scope:** Vendor portal frontend (`/vendor/*`) + backend (`/api/portal/vendor`) + property wizard + property management lifecycle

---

## 1. Vendor Portal Page Inventory

| Route | Purpose | Auth Guard |
|-------|---------|-----------|
| `/vendor/login` | Vendor login | Public |
| `/vendor` | Dashboard / overview | JWT + VENDOR role |
| `/vendor/properties` | Property list | JWT + VENDOR role |
| `/vendor/properties/new` | Property creation wizard | JWT + VENDOR role |
| `/vendor/properties/:id` | Property detail | JWT + VENDOR role |
| `/vendor/properties/:id/edit` | Edit property | JWT + VENDOR role |
| `/vendor/properties/:id/preview` | Preview listing | JWT + VENDOR role |
| `/vendor/properties/:id/activation` | Activation payment | JWT + VENDOR role |
| `/vendor/bookings` | Bookings list | JWT + VENDOR role |
| `/vendor/bookings/:bookingId` | Booking detail | JWT + VENDOR role |
| `/vendor/calendar` | Multi-property calendar | JWT + VENDOR role |
| `/vendor/analytics` | Revenue analytics | JWT + VENDOR role |
| `/vendor/pricing` | Pricing rules | JWT + VENDOR role |
| `/vendor/statements` | Financial statements | JWT + VENDOR role |
| `/vendor/statements/:statementId` | Statement detail | JWT + VENDOR role |
| `/vendor/ops-tasks` | Operations tasks | JWT + VENDOR role |
| `/vendor/ops-tasks/:taskId` | Ops task detail | JWT + VENDOR role |
| `/vendor/maintenance` | Maintenance requests | JWT + VENDOR role |
| `/vendor/work-orders` | Work orders | JWT + VENDOR role |
| `/vendor/reviews` | Guest reviews | JWT + VENDOR role |
| `/vendor/messages` | Messaging inbox | JWT + VENDOR role |
| `/vendor/messages/:threadId` | Thread detail | JWT + VENDOR role |
| `/vendor/notifications` | Notification center | JWT + VENDOR role |
| `/vendor/block-requests` | Block/availability requests | JWT + VENDOR role |

---

## 2. Authentication & Authorization Assessment

### Frontend Guards

```typescript
// apps/web/src/app/(portal)/vendor/layout.tsx
export default function VendorLayout({ children }) {
  return (
    <RequireAuth redirectTo="/vendor/login">
      <RequireRole roles={["VENDOR"]} redirectTo="/account">
        {children}
      </RequireRole>
    </RequireAuth>
  );
}
```

**Assessment:** Frontend uses `RequireAuth` + `RequireRole` guards. This is client-side enforcement only — all routes are also backend-enforced.

### Backend Guards

```typescript
// apps/api/src/portal/vendor/vendor-portal.controller.ts
@Controller('/portal/vendor')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
```

**Assessment:** ✅ All vendor routes are backend-enforced at class level. VENDOR role required. Throttle: 60 req/min.

### Vendor Ownership Enforcement

`assertVendorOwnsPropertyOrThrow()` in `availability.service.ts` performs a DB query to verify `property.vendorId === user.vendorProfile.id` before any property mutation.

**Assessment:** ✅ Ownership verification is DB-backed, not just parameter-trusting.

---

## 3. Property Wizard (7-Step Creation Flow)

**Frontend:** `PropertyWizard` component at `apps/web/src/app/(portal)/vendor/properties/new/page.tsx`

```typescript
// Wizard instantiated via PropertyWizard component
<PropertyWizard onCreated={handleCreated} />
// On create: window.history.replaceState() to edit URL (no full page navigation)
```

### Wizard Steps (inferred from edit section components)

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | Basic Info | Title, type, area, address |
| 2 | Details | Bedrooms, bathrooms, guests, amenities |
| 3 | Media | Upload property photos by category |
| 4 | Pricing | Base price, cleaning fee, min nights |
| 5 | Documents | Ownership proof, holiday home permit |
| 6 | Submit | Final review and submission |
| 7 | Activation | Payment to activate listing |

**Issues:**

| ID | Issue | Severity | Evidence |
|----|-------|---------|---------|
| VP-01 | Wizard state is kept in client-side React state only — refreshing the page loses all unsaved progress | P2 | `PropertyWizard` component does not persist to localStorage or URL params between steps |
| VP-02 | `window.history.replaceState()` used to update URL after property creation — not a proper Next.js router navigation, bypasses any route-change hooks | P2 | `new/page.tsx:13` — `window.history.replaceState(...)` |
| VP-03 | Draft property created in DB immediately at step 1 (DRAFT status) — vendors may create many abandoned DRAFT properties with no cleanup policy | P2 | Backend creates property in DRAFT on `POST /vendor/properties` |

---

## 4. Property Lifecycle Assessment

```
DRAFT → IN_REVIEW → PUBLISHED
       ↓          ↓
   REJECTED    SUSPENDED / ARCHIVED
```

| Status | Who Can Change | Guard |
|--------|---------------|-------|
| DRAFT → IN_REVIEW | Vendor (submit) | Vendor ownership |
| IN_REVIEW → PUBLISHED | Admin only | Admin RBAC |
| IN_REVIEW → REJECTED | Admin only | Admin RBAC |
| PUBLISHED → SUSPENDED | Admin only | Admin RBAC |
| PUBLISHED → ARCHIVED | Admin or vendor-initiated (via DeletionRequest) | Admin approval required |

**Assessment:** ✅ State transitions are correctly gated. Vendors cannot self-publish.

---

## 5. Property Edit After Submission

**Issue:** It is UNKNOWN whether vendors can edit property fields after submission (IN_REVIEW status). If edits are allowed, the reviewed version may differ from what admin approved.

**Recommendation:** Lock editable fields when property is IN_REVIEW. Only allow document re-uploads.

---

## 6. Vendor Financial Flow

### Statements & Payouts

| Model | Purpose | Assessment |
|-------|---------|-----------|
| `VendorStatement` | Monthly statement per vendor/period | ✅ Present |
| `Payout` | Payout per statement | ✅ Present |
| `LedgerEntry` | Double-entry accounting | ✅ Present |

**Issue VP-04:** No automated payout mechanism found. `AutoPayoutWorker` exists in `app.module.ts` but whether it automatically initiates bank transfers or only marks them as "ready for manual processing" is UNKNOWN. Manual payout risk: delayed disbursements harm vendor trust.

### Revenue Analytics

Vendor dashboard fetches `getVendorAnalytics({ range })` with date ranges (30d / 90d / 365d). Analytics include:
- Revenue chart by time bucket
- Booking count chart
- KPIs: propertiesPublished, propertiesUnderReview, bookingsUpcoming, bookingsTotal, revenueCaptured, opsTasksOpen

**Assessment:** Reasonable analytics for current scale.

---

## 7. Vendor Operations

### Ops Tasks

Workers auto-create ops tasks (cleaning, linen, inspection) after booking confirmation. Vendor can view and update task status.

**Assessment:** ✅ Good automation. Standard hospitality operations workflow.

### Maintenance & Work Orders

`/vendor/maintenance` and `/vendor/work-orders` pages exist. These appear to be separate from ops tasks (maintenance = vendor-initiated; work orders = formal repair requests).

**Status:** Pages exist, functional scope not verified — marked PARTIAL.

### Calendar Management

Multi-property calendar at `/vendor/calendar`. Vendor can block dates manually via `POST /portal/vendor/calendar/block`.

```typescript
// vendor-portal.controller.ts
@Post('calendar/block')
createCalendarBlock(@CurrentUser() user, @Body() dto: CreateVendorCalendarBlockDto) { ... }
```

**Assessment:** ✅ Calendar blocking requires JWT + VENDOR role. Date validation in `parseIsoDay()`.

---

## 8. Block Requests

`/vendor/block-requests` page exists. Allows vendors to request availability blocks (e.g., owner stays, maintenance). Admin or system can approve/reject.

**Assessment:** Good feature for hospitality operations.

---

## 9. Vendor Messaging

Real-time messaging via Socket.io. `MessageThread` model with `adminId + counterpartyUserId` unique constraint. Thread-based messaging between vendor and admin.

**Issue VP-05:** Vendor-to-customer messaging is not present. Vendors can only message admin, not guests. For a hospitality platform, guest-vendor communication is typically expected.

---

## 10. Vendor Portal Issues Summary

### P0 — Launch Blockers

None found specific to vendor portal (BOOK-01 from payments audit is relevant).

### P1 — High Priority

| ID | Issue | Fix |
|----|-------|-----|
| VP-04 | AutoPayout mechanism unclear — risk of manual payout failures | Clarify `AutoPayoutWorker` behavior; ensure vendors are notified of payout status |
| VP-05 | No vendor-to-guest direct messaging | Add `MessageThread` type for vendor↔customer or use notification system |

### P2 — Medium Priority

| ID | Issue | Fix |
|----|-------|-----|
| VP-01 | Wizard state lost on page refresh | Persist wizard draft to localStorage or URL params |
| VP-02 | `window.history.replaceState()` in wizard — bypasses Next.js router | Use `router.replace()` from `useRouter()` |
| VP-03 | DRAFT properties accumulate with no cleanup | Add a cron job to archive/delete DRAFTs older than 30 days with no activity |
| VP-06 | Property edit allowed in IN_REVIEW status (UNKNOWN) | Lock fields when property is under review |
| VP-07 | No vendor-facing cancellation policy UI — policy configured but no visual confirmation at wizard time | Add policy preview step in wizard |

### P3 — Low Priority

| ID | Issue | Fix |
|----|-------|-----|
| VP-08 | Vendor preview of listing (`/vendor/properties/:id/preview`) — no verification that preview matches live listing | Ensure preview uses same data as public listing |
| VP-09 | No vendor-facing help center or onboarding guide | Add inline tooltips or help section for first-time vendors |
