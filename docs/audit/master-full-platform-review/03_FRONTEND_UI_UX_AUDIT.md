# 03 — Frontend UI/UX Audit

**Audit date:** 2026-05-23  
**Stack:** Next.js 16.1.5, React 19, TailwindCSS v4, Framer Motion, next-intl (en/ar), Lucide icons

---

## 1. Page Inventory

### Public Site (`/`)

| Page | Route | i18n | Dynamic |
|------|-------|:---:|:---:|
| Homepage | `/` | ✅ | Featured stays, areas |
| Property listing | `/properties` | ✅ | Search results |
| Property detail | `/properties/:slug` | ✅ | Property data + reviews |
| Checkout | `/checkout/:propertyId` | ✅ | Hold + payment |
| Payment return | `/payment/return` | ✅ | Polls status |
| Payment success | `/payment/success` | ✅ | Static |
| Payment failed | `/payment/failed` | ✅ | Static |
| Payment cancelled | `/payment/cancelled` | ✅ | Static |
| Blog list | `/blog` | ✅ | Static content |
| Blog post | `/blog/:slug` | ✅ | Static content |
| Gallery | `/gallery` | ✅ | Static content |
| Gallery item | `/gallery/:slug` | ✅ | Static content |
| About | `/about` | ✅ | Static |
| Services | `/services` | ✅ | Static |
| For owners | `/owners` | ✅ | Static |
| Pricing | `/pricing` | ✅ | Static |
| Contact | `/contact` | ✅ | Form |
| Privacy Policy | `/privacy` | ✅ | Static |
| Terms of Service | `/terms` | ✅ | Static |
| Cancellation Policy | `/cancellation` | ✅ | Static |
| Refund Policy | `/refunds` | ✅ | Static |

### Auth Pages

| Page | Route |
|------|-------|
| Login | `/login` |
| Signup | `/signup` |
| Email verification | `/verify-email` |
| Forgot password | `/forgot-password` |
| Reset password | `/reset-password` |

### Portal Pages

| Portal | Routes |
|--------|-------|
| Customer | `/account/*` (12 pages) |
| Vendor | `/vendor/*` (24 pages) |
| Admin | `/admin/*` (36+ pages) |

---

## 2. Design System Assessment

### Color System

TailwindCSS v4 with CSS custom properties (`--color-bg-rgb`, `--color-primary`, etc.). Components use:
- `bg-surface`, `text-primary`, `text-secondary`, `border-line` — semantic tokens
- `premium-card`, `premium-card-tinted` — custom card classes

**Assessment:** ✅ Semantic color system prevents hardcoded color values. Consistent use of design tokens.

### Typography

Standard Tailwind typography scale with custom tracking/weight classes.

**Assessment:** ✅ Consistent. No inline font-size styles observed.

### Component Library

Uses:
- Custom UI components (`StatCard`, `PortalShell`, `SimpleBarChart`, `FilterChips`)
- Lucide icons
- Framer Motion for animations
- `DashboardSkeleton` loading states

**Assessment:** ✅ Custom component library exists. Skeletons for loading states improve perceived performance.

---

## 3. Accessibility Assessment

### RTL Support

Full Arabic RTL via `next-intl`. Document direction is set based on locale.

**Assessment:** ✅ Arabic UI is present. RTL layout support confirmed via `next-intl` locale switching.

### Keyboard Navigation

**Issue UX-01:** Keyboard navigation through the booking flow has not been tested. Specifically: date picker, guest count stepper, and Stripe Elements must be keyboard-accessible. WCAG 2.1 AA compliance requires this.

### Color Contrast

**Issue UX-02:** `text-secondary` and `text-primary` on `bg-surface` must meet WCAG 4.5:1 contrast ratio. Not verified without visual inspection. Custom CSS variables may not guarantee contrast.

### Screen Reader Labels

**Issue UX-03:** Icon-only buttons (wishlist heart, filter toggles) may lack `aria-label` attributes. Not verified without code inspection.

### Focus Management

**Issue UX-04:** After checkout → payment return → success, focus position is UNKNOWN. Proper focus management is required for accessibility.

---

## 4. Responsive Design Assessment

### Breakpoints

TailwindCSS v4 responsive prefixes used throughout (`sm:`, `lg:`, etc.).

Property detail page uses responsive grid:
```typescript
// checkout/[propertyId]/page.tsx
<div className="grid gap-3 sm:grid-cols-3">
```

**Assessment:** ✅ Responsive breakpoints are used consistently.

**Issue UX-05:** Mobile (390px) layout testing not confirmed. Checkout page and property detail page have complex layouts that may overflow on small viewports.

---

## 5. Key Page Assessments

### Homepage

- Hero section with search bar (`UnifiedSearchBar`)
- Featured stays grid (dynamic, live availability)
- Areas slider (Dubai neighborhoods)
- Partner distribution strip (Airbnb, Booking.com, Agoda etc. logos — trust signals)
- How it works section
- Owner CTA section
- FAQ section
- All sections lazy-loaded via `dynamic()`

**Assessment:** ✅ Strong homepage. Partner logos as trust signals are effective.

**Issue UX-06:** `PartnerDistributionStrip` displays logos of Airbnb, Booking.com, Agoda, Expedia, etc. If these represent OTA distribution channels, that is a strong trust signal. If they are aspirational/false claims, this is a legal risk. Verify these are actual distribution partnerships.

### Property Detail Page

- Full-width gallery hero
- Quote panel with dates, guest count, price breakdown
- Amenities section
- House rules section
- Things to know (check-in, cancellation, safety)
- Guest reviews (verified, tied to completed bookings)
- Location map (Google Maps — lazy-loaded)
- Full English + Arabic copy

**Assessment:** ✅ Comprehensive property detail page. Good information architecture.

**Issue UX-07:** Map shows "area-level location" before booking confirmation, not exact address. This is described as intentional in the copy. This pattern is acceptable but must be clearly communicated — which it is (`areaMapKnown: "Map pin shows area-level location before booking confirmation."`).

**Issue UX-08:** "Things to know — Cancellation" section shows static platform policy text instead of property-specific cancellation policy. Customers may be misled.

### Checkout Page

- Shows stay details (check-in, check-out, nights, guests)
- `CreateBookingCardBatchA` — booking creation + Stripe Elements
- `PendingPaymentCard` — waiting state
- `CurrencySwitcher` component
- Back to property link

**Assessment:** ✅ Clean checkout flow. Server-side nights calculation avoids DST issues.

**Issue UX-09:** Security deposit amount is not shown as a separate line item in the checkout UI (matches PAY-01 in payment audit). Customer may be surprised by the total.

**Issue UX-10:** No progress indicator (steps) in checkout. For first-time users, it's unclear that the page will redirect to Stripe Elements.

### Auth Pages

- Login, signup, verify-email, forgot-password, reset-password
- Standard form layout

**Issue UX-11:** Auth pages use `/login` for customers and `/vendor/login` for vendors. Admin login path is UNKNOWN (likely `/login` then RBAC redirect). This split login experience may confuse users who register as customers but want to become vendors.

---

## 6. i18n (Internationalization) Assessment

### English / Arabic

Both languages are fully implemented with:
- All page copy in `HOME_COPY`, `PROPERTY_PAGE_COPY` etc. as bilingual objects
- RTL layout via `next-intl`
- Portal strings via `useTranslations("portal")`

**Assessment:** ✅ Comprehensive bilingual support. Arabic is a major differentiator in the UAE market.

**Issue UX-12:** Some portal translations may be incomplete. `tPortal("vendorDashboard.errors.load")` — if the translation key is missing, the raw key string is displayed. Not verified for all keys.

---

## 7. Performance UX

- Skeleton loading states present for dashboard and property listing
- Dynamic imports for all heavy sections
- Property calendar and Google Map deferred

**Issue UX-13:** `PublicPropertyCalendar` loading skeleton is an animated placeholder at 420px height. If the calendar takes > 2 seconds to load, users may interact with the page before the calendar is visible, leading to missed availability selections.

---

## 8. Frontend Issues Summary

### P1 — High Priority

| ID | Issue | Fix |
|----|-------|-----|
| UX-06 | Partner logos may be aspirational (not actual distribution) — legal risk | Verify/remove any partnership claims that don't reflect actual agreements |
| UX-08 | Static cancellation policy text on property detail (not property-specific) | Display property's `CancellationPolicyConfig` on property detail page |
| UX-09 | Security deposit not itemized in checkout | Show security deposit as separate line item |

### P2 — Medium Priority

| ID | Issue | Fix |
|----|-------|-----|
| UX-01 | Keyboard navigation through booking flow not tested | Run WCAG audit; fix keyboard traps |
| UX-02 | Color contrast not verified for text-secondary on bg-surface | Run contrast checker against design tokens |
| UX-05 | Mobile 390px layout not confirmed tested | Manual test on mobile viewport |
| UX-10 | No checkout progress indicator | Add 3-step progress bar: Review → Payment → Confirm |
| UX-11 | Split customer/vendor login UX | Unify login page with role detection or clear "Are you a vendor?" flow |

### P3 — Low Priority

| ID | Issue | Fix |
|----|-------|-----|
| UX-03 | Icon-only buttons may lack aria-label | Audit all icon buttons for accessibility labels |
| UX-04 | Focus management after payment flow | Add `focus()` call to main heading after navigation |
| UX-07 | Area-level map before booking is acceptable — already communicated | No change needed |
| UX-12 | Incomplete portal translation keys may show raw keys | Audit all `useTranslations` keys for completeness |
| UX-13 | Calendar late-loading | Preload calendar data in SSR for above-fold display |
