# 10 — Admin Portal Audit

**Audit date:** 2026-05-23  
**Scope:** Admin portal frontend (`/admin/*`) + backend (`/api/portal/admin`) + all admin-controlled workflows

---

## 1. Admin Portal Page Inventory

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview (KPIs, activity) |
| `/admin/properties` | All properties list |
| `/admin/properties/new` | Create property (admin-created) |
| `/admin/properties/:id` | Property detail |
| `/admin/properties/:id/edit` | Edit any property |
| `/admin/properties/:id/preview` | Preview listing |
| `/admin/properties/:id/pricing` | Manage pricing rules |
| `/admin/properties/deletion-requests` | Vendor deletion requests |
| `/admin/properties/unpublish-requests` | Vendor unpublish requests |
| `/admin/review-queue` | Properties awaiting admin review |
| `/admin/review-queue/:propertyId` | Review individual property |
| `/admin/bookings` | All bookings list |
| `/admin/bookings/:bookingId` | Booking detail |
| `/admin/payments` | Payments list |
| `/admin/payments/:paymentId` | Payment detail |
| `/admin/refunds` | Refunds list |
| `/admin/refunds/:refundId` | Refund detail + issuance |
| `/admin/payouts` | Vendor payouts list |
| `/admin/payouts/:payoutId` | Payout detail |
| `/admin/statements` | Vendor statements |
| `/admin/statements/:statementId` | Statement detail |
| `/admin/vendors` | Vendor list |
| `/admin/vendors/:vendorId` | Vendor detail + approval/rejection |
| `/admin/reviews` | Guest reviews moderation |
| `/admin/analytics` | Platform-wide analytics |
| `/admin/calendar` | Platform calendar view |
| `/admin/ops-tasks` | All operations tasks |
| `/admin/ops-tasks/:taskId` | Ops task detail |
| `/admin/contact-submissions` | Contact form submissions |
| `/admin/contact-submissions/:submissionId` | Submission detail |
| `/admin/customer-documents` | Customer document verification |
| `/admin/customer-documents/:documentId` | Document detail |
| `/admin/messages` | Admin messaging inbox |
| `/admin/messages/:threadId` | Thread detail |
| `/admin/notifications` | Admin notifications |
| `/admin/block-requests` | Block/availability requests |

---

## 2. Authentication & Authorization Assessment

### Frontend Guards

```typescript
// apps/web/src/app/(portal)/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <RequireAuth redirectTo="/login">
      <RequireRole roles={["ADMIN"]} redirectTo="/">
        {children}
      </RequireRole>
    </RequireAuth>
  );
}
```

### Backend Guards

```typescript
// apps/api/src/portal/admin/admin-portal.controller.ts
@Controller('/portal/admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
```

**Assessment:** ✅ All admin routes are backend-enforced at class level. Throttle: 60 req/min per user.

---

## 3. Admin Dashboard KPIs

```typescript
// admin-portal.service.ts — AdminOverview type
kpis: {
  usersTotal: number;
  vendorsPending: number;
  propertiesUnderReview: number;
  propertiesPublished: number;
  bookingsPendingPayment: number;
  bookingsConfirmed: number;
  bookingsCancelled: number;
  revenueCaptured: number;
  refundsPending: number;
  opsTasksOpen: number;
}
```

**Assessment:** KPI set is appropriate for a marketplace admin. Revenue, user growth, booking pipeline, and operational health are all represented.

---

## 4. Property Review Workflow

### Admin Review Queue

| Step | Action | Guard |
|------|--------|-------|
| 1 | Vendor submits property (IN_REVIEW) | Vendor role |
| 2 | Admin sees in `/admin/review-queue` | Admin role |
| 3 | Admin opens property review | Admin role |
| 4 | Admin approves → PUBLISHED or rejects → REJECTED | Admin role + ownership |

**Issue AP-01:** No audit log for approve/reject decisions. The `PropertyReview` table exists but whether every approve/reject is recorded with admin ID, timestamp, and reason is UNKNOWN. Evidence: `AdminAuditLog` model does not exist in `schema.prisma`.

**Issue AP-02:** Photo category completeness (`LIVING_ROOM`, `BEDROOM`, `BATHROOM`, `KITCHEN`) required before approval — whether admin review UI enforces this check is UNKNOWN. Recommend: display completeness checklist on review page.

### Deletion Requests

`/admin/properties/deletion-requests` — vendor requests property deletion, admin must approve. This prevents hard-deletes of properties with active bookings.

**Assessment:** ✅ Correct soft-delete workflow via admin approval.

---

## 5. Vendor Management

| Action | Evidence | Assessment |
|--------|---------|-----------|
| View vendor list with status filter | `/admin/vendors` page | ✅ |
| Approve / reject vendor | `/admin/vendors/:vendorId` | ✅ ADMIN role |
| View vendor financial statements | `/admin/statements` | ✅ |
| Issue payouts | `/admin/payouts` | ✅ ADMIN role |

**Issue AP-03:** Vendor approval does not require document verification in the API code. Whether admin is required to review HOLIDAY_HOME_PERMIT and OWNERSHIP_PROOF before approving a vendor/property is UNKNOWN (depends on review queue UI enforcement).

---

## 6. Booking & Payment Management

### Bookings

Admin can view all bookings, filter by status. Admin can view booking detail including payment breakdown, cancellation history, and refund status.

### Refunds

`/admin/refunds/:refundId` — admin can issue refund with optional `amountOverride`.

**Issue AP-04 (same as PAY-04):** Refund `amountOverride` is not bounded against `payment.amount` in `payments.service.ts:909`. Over-refund possible.

### Document Download

```typescript
// admin-portal.controller.ts
@Get('properties/:propertyId/documents/:docId/download')
async downloadPropertyDocument(...) {
  const docPath = join(BOOKING_DOCUMENTS_DIR, storageKey);
  if (!existsSync(docPath)) throw new NotFoundException();
  const stream = createReadStream(docPath);
  return new StreamableFile(stream, { type: mimeType, disposition: `attachment; filename="${fileName}"` });
}
```

**Assessment:** ✅ Document download uses `existsSync` + `StreamableFile`. No path traversal protection explicitly shown — verify `storageKey` does not allow `../` sequences. This is a P1 security concern.

**Issue AP-05:** Document storage key is taken from DB (`storageKey` field). If a path traversal value was inserted into the DB, it could be exploited via the download endpoint. Add `path.basename(storageKey)` validation before joining paths.

---

## 7. Customer Documents

`/admin/customer-documents` — admin can view and verify customer identity documents.

```typescript
// admin-portal.service.ts imports
CustomerDocumentStatus, CustomerDocumentType
```

**Assessment:** Customer document verification workflow exists. Specific review criteria and auto-approval logic is UNKNOWN.

---

## 8. Contact Submissions

`/admin/contact-submissions` — admin reviews and resolves public contact form submissions.

`ContactSubmission.status` field: `OPEN | RESOLVED`

**Assessment:** ✅ Basic contact form management present.

---

## 9. Analytics

`/admin/analytics` provides platform-wide revenue, booking count, and user growth charts with time-range filters (30d / 90d / 365d).

**Issue AP-06:** Analytics are real-time DB queries with no caching. At scale (10k+ bookings), overview queries scanning full tables will be slow. Add `MATERIALIZED VIEW` or a caching layer for analytics data.

---

## 10. Admin Portal Issues Summary

### P0 — Launch Blockers

None specific to admin portal.

### P1 — High Priority

| ID | Issue | Evidence | Fix |
|----|-------|---------|-----|
| AP-01 | No audit log for admin actions (approve/reject property, issue refund, approve vendor) | No `AdminActionLog` model | Create `AdminActionLog` table: adminId, action, entityId, entityType, reason, timestamp |
| AP-04 | Refund `amountOverride` not bounded | `payments.service.ts:909` | Add: `if (override > payment.amount) throw BadRequestException` |
| AP-05 | Document download path traversal risk | `admin-portal.controller.ts` — `storageKey` not sanitized | Validate: `if (storageKey.includes('..')) throw BadRequestException` |

### P2 — Medium Priority

| ID | Issue | Fix |
|----|-------|-----|
| AP-02 | Photo category completeness not enforced in review UI | Add checklist on review queue page; block approval if required categories missing |
| AP-03 | Vendor document verification not gated in approval flow | Require OWNERSHIP_PROOF + HOLIDAY_HOME_PERMIT accepted before vendor approval |
| AP-06 | Analytics queries uncached — performance risk at scale | Add Redis cache (TTL 5min) on overview stats |

### P3 — Low Priority

| ID | Issue | Fix |
|----|-------|-----|
| AP-07 | No admin activity dashboard (who did what today) | Add admin action log viewer |
| AP-08 | No bulk actions on review queue | Add bulk approve/reject for efficiency |
| AP-09 | Admin portal has no session timeout warning | Add idle session warning at 30min, auto-logout at 40min |
