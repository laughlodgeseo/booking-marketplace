<div align="center">

  <a href="https://www.rentpropertyuae.com">
    <img src="./apps/web/public/brand/logo.svg" alt="Laugh & Lodge brand identity" width="238" />
  </a>

  <h1>LAUGH &amp; LODGE</h1>

  <p><strong>Exceptional stays. Considered technology. One connected hospitality platform.</strong></p>

  <p>A Dubai-focused property marketplace and operating system, bringing guests, property owners and hospitality teams together — from discovery and availability to confirmed stays, owner operations and financial records.</p>

  <p>
    <a href="#the-experience"><strong>Experience</strong></a> &nbsp;·&nbsp;
    <a href="#platform-architecture"><strong>Architecture</strong></a> &nbsp;·&nbsp;
    <a href="#engineering-intelligence"><strong>Engineering intelligence</strong></a> &nbsp;·&nbsp;
    <a href="#run-the-platform"><strong>Get started</strong></a> &nbsp;·&nbsp;
    <a href="#delivery--release-truth"><strong>Release truth</strong></a>
  </p>

  <p>
    <a href="https://github.com/laughlodgeseo/booking-marketplace/actions/workflows/ci.yml"><img src="https://github.com/laughlodgeseo/booking-marketplace/actions/workflows/ci.yml/badge.svg?branch=main" alt="Current main-branch CI status" /></a>
    <img src="https://img.shields.io/badge/Next.js-16.2.6-131621?style=flat-square&amp;logo=nextdotjs&amp;logoColor=white" alt="Next.js 16.2.6" />
    <img src="https://img.shields.io/badge/NestJS-11-131621?style=flat-square&amp;logo=nestjs&amp;logoColor=white" alt="NestJS 11" />
    <img src="https://img.shields.io/badge/PostgreSQL-Prisma%206-131621?style=flat-square&amp;logo=postgresql&amp;logoColor=white" alt="PostgreSQL with Prisma 6" />
    <img src="https://img.shields.io/badge/English%20%2B%20Arabic-RTL-6564EC?style=flat-square" alt="English and Arabic with RTL" />
  </p>

  <img src="./apps/web/public/images/home/hero-main.webp" alt="Architectural and hospitality imagery used in the Laugh & Lodge website" width="920" />

  <p><sub>RENT PROPERTY UAE &nbsp; / &nbsp; HOSPITALITY COMMERCE &nbsp; / &nbsp; OWNER OPERATIONS</sub></p>

</div>

---

> [!IMPORTANT]
> **Source implementation ≠ production certification.** The latest CI run inspected before this README update, on [`0372022`](https://github.com/laughlodgeseo/booking-marketplace/commit/0372022e18a0494b7a3e4838fbb45a1a44351668), [failed at frontend lint](https://github.com/laughlodgeseo/booking-marketplace/actions/runs/39156235426) on **18 October 2026** (4 errors and 18 warnings); its typecheck, test and build steps were skipped. Consequently this README does **not** claim a current green build, test pass, deployed payment acceptance or approved commercial go-live. The workflow badge above shows the current branch result as GitHub updates it.

## The experience

**Laugh & Lodge** (RentPropertyUAE) is a two-application, three-sided hospitality ecosystem. Guests explore short-term stays; owners create and operate inventory; the admin team governs listing quality, reservations, payments and service operations. The system is built around **Dubai/UAE short-stay accommodation**, with English/Arabic presentation and AED as its canonical transaction currency.

<table>
  <tr>
    <td width="33%">
      <strong>01 / Discover</strong>
      <br/><sub>GUEST EXPERIENCE</sub>
      <br/><br/>Explore stays, compare amenities, check dates and receive availability-aware pricing before reserving.
      <br/><br/><a href="#guest-journey">Explore guest journey</a>
    </td>
    <td width="33%">
      <strong>02 / Host</strong>
      <br/><sub>PROPERTY PARTNER STUDIO</sub>
      <br/><br/>Onboard, prepare property inventory, submit documentation, manage calendars and review bookings.
      <br/><br/><a href="#property-partner-journey">Explore owner journey</a>
    </td>
    <td width="33%">
      <strong>03 / Operate</strong>
      <br/><sub>ADMINISTRATION & FINANCE</sub>
      <br/><br/>Review listings, coordinate hospitality work, oversee payments, refunds, statements and audit events.
      <br/><br/><a href="#operations--financial-controls">Explore operations</a>
    </td>
  </tr>
</table>

### Product surfaces

| Experience | Capabilities represented in source | Representative routes |
| :--- | :--- | :--- |
| **Public website** | Editorial homepage, search, property detail, availability, price enquiry, policies, contact, journal and owner acquisition | `/` · `/properties` · `/properties/[slug]` · `/owners` |
| **Guest portal** | Reservation history, document access, wishlist, profile, notifications, refunds, calendar and conversations | `/account` · `/account/bookings` · `/account/wishlist` |
| **Property owner portal** | Onboarding, listing edit and moderation, documents, activation fees, calendars, pricing, reservations, work orders, statements and payout settings | `/vendor` · `/vendor/properties` · `/vendor/analytics` |
| **Operations portal** | Property approval queue, vendors, bookings, payments, refund review, owner payouts, contact submissions, messaging, operational tasks and analytics | `/admin` · `/admin/review-queue` · `/admin/payments` |
| **Identity & access** | Sign-up, verification, sign-in, reset flows and separate portal entry points | `/signup` · `/login` · `/vendor/login` · `/admin/login` |

**What is distinct:** browsing a property, holding its calendar dates, making a payment and reaching `CONFIRMED` are **different system states**. Similarly, approved owner identity, approved listing content, required activation-fee evidence and public listing availability must not be conflated.

## Guest journey

The booking engine coordinates inventory, quotations, payment windows and post-payment state transitions. The source defines a **15-minute payment window**, with worker-based expiration of unpaid reservations.

```mermaid
flowchart LR
    A["Discover stays"] --> B["Property details<br/>amenities · location · gallery"]
    B --> C["Choose dates<br/>and guests"]
    C --> D{"Published and<br/>available?"}
    D -->|No| X["Adjust dates<br/>or choose another stay"]
    D -->|Yes| E["Quote in AED<br/>tax and fee breakdown"]
    E --> F["Create availability hold<br/>15-minute payment window"]
    F --> G["Create booking<br/>and Stripe payment"]
    G --> H{"Verified provider<br/>event?"}
    H -->|Failed / expired| Y["Reconcile or release<br/>reserved inventory"]
    H -->|Paid| I["Confirmed booking"]
    I --> J["Guest history<br/>messages · documents"]
    J --> K["Stay completion<br/>and review workflow"]
```

The browser's return page is **not** payment authority. The API processes signed Stripe events and maintains payment/booking transitions in server-controlled services.

**Trace the implementation:** [availability & holds](./apps/api/src/modules/availability/availability.service.ts) · [booking service](./apps/api/src/bookings/bookings.service.ts) · [Stripe webhook controller](./apps/api/src/modules/payments/payments.webhooks.controller.ts) · [payment service](./apps/api/src/modules/payments/payments.service.ts)

## Property partner journey

Property onboarding is a structured approval system, not an unconditional publish button. It combines owner state, document review, property moderation and eligible activation/payment conditions.

```mermaid
flowchart TD
    A["Owner account / onboarding"] --> B["Create property draft"]
    B --> C["Listing details<br/>media · calendar · pricing"]
    C --> D["Ownership & holiday-home<br/>document workflows"]
    D --> E["Submit for review"]
    E --> F{"Admin decision"}
    F -->|Changes requested| B
    F -->|Rejected| Z["Review rejection"]
    F -->|Approved| G{"Activation<br/>requirements settled?"}
    G -->|Not yet| H["Pending activation fee<br/>and verified payment"]
    H --> G
    G -->|Yes| I["Eligible to publish"]
    I --> J["Publicly bookable<br/>when availability permits"]
    J --> K["Booking operations<br/>earnings · maintenance"]
```

The Prisma lifecycle includes `DRAFT`, `UNDER_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `APPROVED_PENDING_ACTIVATION_PAYMENT`, `PUBLISHED`, `SUSPENDED` and `ARCHIVED`. Actual allowable transitions depend on the responsible service, reviewer permissions and applicable payment state.

**Source entry points:** [owner onboarding](./apps/api/src/vendor/vendor-onboarding.service.ts) · [property document service](./apps/api/src/modules/properties/documents/property-documents.service.ts) · [activation payments](./apps/api/src/modules/payments/activation-payment.service.ts) · [vendor dashboard](./apps/web/src/app/%28portal%29/vendor/page.tsx)

> [!NOTE]
> The product supports document-handling workflows relevant to UAE holiday-home and ownership verification. Repository code and stored documents **do not establish** that any individual property is DTCM-approved, that every host has a valid permit, or that current legal requirements have been independently certified.

## Operations & financial controls

Commercial operations cover more than accepting card payments. The project separates reservation payment records, owner statements, payouts, refunds, service work and activity evidence.

| Domain | Designed capability | Source of authority |
| :--- | :--- | :--- |
| **Payments** | Stripe PaymentIntent/checkout handling, webhook verification, retry/idempotency paths and event persistence | [Payments service](./apps/api/src/modules/payments/payments.service.ts) |
| **Availability** | Date-range validation, calendar holds, collision prevention, booking expiry and cancellation handling | [Availability service](./apps/api/src/modules/availability/availability.service.ts) |
| **Price formation** | Nightly rates, price rules, cleaning fees and Dubai-specific tax/fee component snapshots | [Dubai tax service](./apps/api/src/common/pricing/dubai-tax.service.ts) |
| **Currency display** | AED canonical money, supported customer display currencies and FX-rate persistence/cache | [FX rates service](./apps/api/src/modules/fx/fx-rates.service.ts) |
| **Vendor accounting** | Ledger entries, owner statement and available-balance projections | [Ledger service](./apps/api/src/modules/finance/services/ledger.service.ts) |
| **Owner payouts** | Destination management, payout lifecycle, supporting documents and admin review | [Vendor payout lifecycle](./apps/api/src/modules/finance/services/vendor-payout-lifecycle.service.ts) |
| **Hospitality operations** | Maintenance requests, work orders, operational tasks and moderation queues | [API modules](./apps/api/src/modules/) |
| **Communication** | Portal messages, email notifications and transactional event-outbox handling | [Event outbox](./apps/api/src/events/outbox/event-outbox.service.ts) |

Amounts intended for transactional storage use minor currency units; FX ratios use decimal precision. Refunds, disbursements and third-party confirmations remain separate authorization paths. A database ledger is not, by itself, proof of balanced external settlement or an approved finance operation.

### From payment to reconciliation

```mermaid
sequenceDiagram
    autonumber
    participant Guest
    participant Web as Next.js
    participant API as NestJS
    participant Stripe
    participant DB as PostgreSQL
    participant Worker as Queue / Worker
    Guest->>Web: Confirm stay and payment
    Web->>API: Authorized booking/payment request
    API->>DB: Validate hold, pricing and ownership
    API->>Stripe: Create payment intent/session
    Stripe-->>Guest: Hosted/payment-element flow
    Stripe->>API: Signed webhook payload
    API->>API: Verify signature against raw body
    API->>DB: Deduplicate and record event
    API->>Worker: Process eligible events
    Worker->>DB: Commit booking/payment/ledger transitions
    Web->>API: Read canonical booking status
    API-->>Guest: Confirmed or actionable status
```

**Diagram note:** this illustrates the intended authoritative boundaries; exact event processing can use synchronous handling and/or queued processing according to the webhook event and available infrastructure. It is not a live Stripe integration test result.

## Platform architecture

The codebase uses a **pnpm/Turborepo monorepo** with a separate **Next.js web application** and **NestJS API**. Source configuration targets Vercel for the web experience and Railway for the API, backed by PostgreSQL/Prisma, Redis/BullMQ and vendor integrations.

```mermaid
flowchart TB
    subgraph Clients["Experience layer"]
        PUB["Public website"]
        CUS["Guest portal"]
        VEN["Owner portal"]
        ADM["Admin portal"]
    end
    subgraph Web["Web · apps/web"]
        NEXT["Next.js 16 App Router<br/>React 19 · TypeScript"]
        LOCALE["English / Arabic<br/>localization + RTL"]
    end
    subgraph API["Services · apps/api"]
        NEST["NestJS 11 REST API<br/>JWT · guards · validation"]
        DOM["Property · booking · pricing<br/>payment · vendor · operations"]
        QUEUE["BullMQ & scheduled workers<br/>expiry · webhook · outbox"]
    end
    subgraph Data["Data plane"]
        PG[("PostgreSQL<br/>Prisma schema + migrations")]
        REDIS[("Redis<br/>queue/cache infrastructure")]
    end
    subgraph External["External services"]
        STRIPE["Stripe<br/>payment provider"]
        CLOUD["Cloudinary<br/>media & private documents"]
        EMAIL["Resend<br/>transactional email"]
        MAPS["Google Maps<br/>location presentation"]
    end
    PUB & CUS & VEN & ADM --> NEXT
    NEXT --> LOCALE
    NEXT --> NEST
    NEST --> DOM
    DOM --> PG
    DOM <--> QUEUE
    QUEUE <--> REDIS
    DOM <--> STRIPE
    DOM <--> CLOUD
    DOM --> EMAIL
    NEXT --> MAPS
```

The Next.js configuration forwards most `/api/*` routes to the API origin, while retaining specific local handlers. The API uses a dedicated raw-body route for Stripe webhooks; separate workers and scheduled tasks manage asynchronous duties. Availability of a configured service is not proof that its live credentials and processing resources are operational.

### Technology stack

| Layer | Versions / primary libraries |
| :--- | :--- |
| Web | **Next.js 16.2.6** · **React 19.2.3** · TypeScript 5 · Tailwind CSS 4 |
| API | **NestJS 11** · Node.js 22 · Express 5 · Passport/JWT |
| Monorepo | **pnpm 10.28.2** · Turborepo 2 |
| Data | **PostgreSQL 16** (local Compose) · **Prisma 6.19.2** |
| Workflows | Redis 7 · BullMQ 5 · NestJS scheduler |
| Money | Stripe Node SDK 20 · minor-unit AED accounting · FX snapshots |
| Media & email | Cloudinary · Resend |
| Languages | next-intl 4 · English/Arabic · RTL utilities |
| Messaging & insights | Socket.IO 4 · Sentry integration |
| Testing | Jest 30 (API) · Vitest 4 (web) · Playwright-style browser specs |
| Deployment | Multi-stage Docker API · Railway config · Vercel-oriented Next.js app |

*Library versions above come from checked-in package manifests, not a vulnerability scan or an assertion that deployed containers match the manifests.*

## Engineering intelligence

This is an **auditable repository snapshot**, not fabricated booking, revenue, traffic, conversion or test-pass analytics.

<details open>
<summary><strong>Source census · 16 November 2026 · baseline `0372022`</strong></summary>

Counts were derived from the full tracked file tree on `main` before this README-only update. They are **file/declaration counts**, not success-rate, quality or commercial KPIs.

| Repository signal | Measured count | Counting rule |
| :--- | ---: | :--- |
| **Tracked files** | **1,072** | Git tree blobs |
| **Web route pages** | **110** | `apps/web/src/app/**/page.tsx` |
| **NestJS controllers** | **52** | `apps/api/src/**/*.controller.ts` |
| **NestJS services** | **55** | `apps/api/src/**/*.service.ts` |
| **Prisma models** | **61** | `model` declarations in the Prisma schema |
| **Prisma enums** | **59** | `enum` declarations in the Prisma schema |
| **SQL migrations** | **53** | Versioned `migration.sql` files |
| **Test source files** | **44** | Tracked `*.spec.*` / `*.test.*` |
| **Web UI TSX components** | **201** | `apps/web/components/**/*.tsx` |
| **Engineering Markdown docs** | **21** | `docs/**/*.md` |

</details>

### Page footprint by experience

```mermaid
pie showData
    title Web application pages by experience (110)
    "Admin" : 39
    "Property owner" : 27
    "Public website" : 22
    "Guest portal" : 12
    "Authentication" : 9
    "Other" : 1
```

*Counts reflect routing and are not weighted by actual user engagement, capability completeness or deployment readiness.*

### Test inventory by runner family

```mermaid
pie showData
    title Tracked test files by location (44)
    "API / Jest" : 35
    "Web / Vitest" : 7
    "Root browser specs" : 2
```

**Interpretation:** this reports the number of tracked test files, **not** executed assertions or pass percentage. The 2026-10-18 CI run reached lint, failed there, and skipped its later typecheck/test/build stages; historical pass counts in earlier README revisions do not establish current-SHA verification.

### An honest evidence hierarchy

| Evidence | What it actually proves |
| :--- | :--- |
| Source file or route exists | An implementation surface is present; behavior still needs testing |
| Focused unit test passes | Selected logic is verified under test conditions |
| Integration/E2E test passes | A specific cross-service/browser scenario passed in that environment |
| GitHub CI passes on exact SHA | The configured pipeline completed for that source revision |
| Sandbox payment webhook succeeds | Provider test events and application states agree in a controlled test |
| Operational/finance sign-off | Authorized people accepted real-world policies, accounts, deployment and settlement |

The earlier [full-platform audit](./docs/audit/master-full-platform-review/MASTER_AUDIT_REPORT.md) and [risk register](./docs/audit/master-full-platform-review/16_FINAL_RISK_REGISTER.md) are dated **23 May 2026**; they describe an older code state and must not be read as a current remediation receipt. The repo now contains later security and product implementations, but the current branch still requires its own clean qualification.

## Repository atlas

```text
booking-marketplace/
├── apps/
│   ├── api/
│   │   ├── prisma/                  Schema, migrations, seed
│   │   ├── src/
│   │   │   ├── auth/                Authentication and access guards
│   │   │   ├── bookings/            Booking creation, expiry, cancellation
│   │   │   ├── modules/             Availability, pricing, payments, finance ...
│   │   │   ├── portal/              Guest, vendor and admin endpoints
│   │   │   ├── infra/               Redis, queues, media/storage
│   │   │   └── workers/             Scheduled domain processors
│   │   └── package.json
│   └── web/
│       ├── src/app/                 Public and role-scoped Next.js pages
│       ├── components/              Design and portal component system
│       ├── messages/                English and Arabic strings
│       ├── public/                  Approved-in-repo brand/media assets
│       └── package.json
├── docs/audit/                    Historical audit and assessment
├── infra/docker/                  Local PostgreSQL + Redis services
├── .github/workflows/ci.yml        Current CI definition
├── Dockerfile                      Non-root API runtime build
├── railway.toml                    API deployment configuration
├── pnpm-workspace.yaml             pnpm workspace
└── turbo.json                      Build/test orchestration
```

## Run the platform

### Prerequisites

Install **Node.js 22**, **pnpm 10.28.2**, and **Docker** (or equivalent PostgreSQL + Redis instances). Payments, email, maps and media require independently managed provider accounts for their respective features. Do not use real provider credentials in a local or shared disposable environment.

### 01 / Clone and install

```bash
git clone https://github.com/laughlodgeseo/booking-marketplace.git
cd booking-marketplace

corepack enable
corepack prepare pnpm@10.28.2 --activate
pnpm install --frozen-lockfile
```

### 02 / Start local infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

The checked-in local Compose file starts **PostgreSQL 16** on `localhost:5432` and **Redis 7** on `localhost:6379`. Its example PostgreSQL credentials are `booking` / `booking` for local use only, **not** production credentials.

### 03 / Create local configuration

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Edit both untracked files. The examples contain deployment-oriented values and placeholders; **do not run a copied API template unchanged**. A local API configuration needs, at minimum:

```dotenv
# apps/api/.env — LOCAL DEVELOPMENT ONLY
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://booking:booking@localhost:5432/booking
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3000

# Supply distinct, long local-only secrets; never publish them.
JWT_ACCESS_SECRET=replace_with_a_unique_local_secret_at_least_32_chars
JWT_REFRESH_SECRET=replace_with_another_unique_local_secret_at_least_32_chars
```

```dotenv
# apps/web/.env.local — LOCAL DEVELOPMENT ONLY
NEXT_PUBLIC_API_ORIGIN=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,ar
NEXT_PUBLIC_SUPPORTED_CURRENCIES=AED,USD,SAR,EUR,GBP
```

Set other service-specific variables only if exercising those services, with **Stripe test mode** for authorized development payments. Review [the API environment template](./apps/api/.env.example) and [the web environment template](./apps/web/.env.example); do not commit populated `.env` files.

### 04 / Generate and migrate

```bash
pnpm --filter api prisma:generate
pnpm --filter api db:migrate:deploy
```

The checked-in Prisma migration history is part of the system of record. Never run destructive migration/reset commands against environments containing real financial records.

### 05 / Develop

```bash
pnpm dev
```

Or run independently with `pnpm --filter api dev` and `pnpm --filter web dev`. With the local configuration above, the web app is at **http://localhost:3000**, and the API targets **http://localhost:3001**.

> [!TIP]
> Development boot proves only that the relevant services and configuration can start. The first live quote, card checkout, verified document upload and transactional email each need provider-specific configuration and isolated acceptance.

## Quality & developer workflow

| Verification | Command | Scope |
| :--- | :--- | :--- |
| Workspace lint | `pnpm lint` | API + web ESLint |
| API static types | `pnpm --filter api typecheck` | NestJS/TypeScript |
| Web static types | `pnpm --filter web typecheck` | Next.js/TypeScript |
| Workspace tests | `pnpm test` | Configured Jest + Vitest suites |
| API coverage | `pnpm --filter api test:cov` | Jest collection |
| API E2E | `pnpm --filter api test:e2e` | NestJS e2e config |
| Prisma schema check | `pnpm --filter api exec prisma validate` | Schema validation |
| Web build | `pnpm --filter web build` | Next.js production compilation |
| API build | `pnpm --filter api build` | Prisma generate + NestJS compilation |
| Full workspace build | `pnpm build` | Turborepo pipeline |
| Bundle analysis | `pnpm --filter web analyze` | Web bundle inspection |

**Lint caveat:** `apps/api/package.json` currently defines API lint with `eslint ... --fix`, which **can modify files in the local checkout**. Review your working tree before and after running it; the README change does not alter this script.

**Current qualification gap (pre-README baseline):** [CI run 39156235426](https://github.com/laughlodgeseo/booking-marketplace/actions/runs/39156235426) had **4 web lint errors** and **18 warnings**. Typecheck, tests and build were not reached in that run. Correctness and release status must be reevaluated on the source SHA actually being promoted; no README text can supply those missing checks.

## Security & trust boundaries

The repository contains implementation surfaces for these controls, subject to exact-build and deployment validation:

- **Identity & ownership:** JWT access/refresh boundaries, portal role checks and resource ownership enforcement.
- **Payment integrity:** raw-body Stripe webhook signature verification, event deduplication, idempotent business transitions and provider-state reconciliation.
- **Booking correctness:** property-status checks, availability holds, expiry handling, prevention of incompatible overlapping reservations and server-side amount calculation.
- **Owner governance:** document-review and listing-approval paths before eligible publication and booking.
- **Data protection:** controlled property/customer document routes, storage checks, server-side upload signing and media-type constraints.
- **Operational auditability:** admin action logging, booking/payment events, outbox deliveries, statements and payouts.
- **Runtime protections:** validation, Helmet, configured CORS origins, rate limiting, multi-stage API container and non-root runtime user.

A source control implementation is **not** proof of a completed security audit, compliance review, penetration test, incident drill or privacy assessment. Do not publish real identity documents, bank accounts, signing secrets, private contact information or Stripe payloads in issues, screenshots or README examples.

## Delivery & release truth

```mermaid
flowchart LR
    A["Source commit"] --> B["Dependency install<br/>Prisma validate"]
    B --> C["Lint / types"]
    C --> D["Tests / build"]
    D --> E["Isolated integration<br/>and browser acceptance"]
    E --> F["Provider, data and<br/>operational checks"]
    F --> G{"Authorized<br/>release decision"}
    G -->|No| H["Hold release<br/>record missing evidence"]
    G -->|Yes| I["Approve deployment<br/>and monitor"]
```

**The current main-branch CI status is visible in the badge at the top.** A CI badge is a workflow outcome, not an assertion of Stripe settlement or real-world hospitality readiness. The deployment topology in source is:

| Deployment surface | Code/config | Release-sensitive responsibility |
| :--- | :--- | :--- |
| **Web** | [`apps/web`](./apps/web/) · [Next.js config](./apps/web/next.config.ts) | User-facing Next.js application, locales, API proxy/origin |
| **API** | [`apps/api`](./apps/api/) · [Railway config](./railway.toml) | NestJS runtime, API health checks, app/provider configuration |
| **Database** | [Prisma schema](./apps/api/prisma/schema.prisma) · [migrations](./apps/api/prisma/migrations/) | Versioned schema changes, backups, data preservation |
| **Jobs & cache** | [Queues](./apps/api/src/infra/queues/queue.module.ts) · [worker services](./apps/api/src/workers/) | Booking expiry, payment-related events, outbox and scheduled duties |
| **Images and identity media** | [Storage infrastructure](./apps/api/src/infra/storage/) | Secret management, upload policy and private document access |

`railway.toml` configures Prisma migration deployment as a release command. The Dockerfile builds a non-root API runtime; it is not a Vercel deployment artifact. The project configuration should be validated against the actual hosting account, domains, health status, queues and provider mode before go-live.

### What still requires a genuine acceptance record

| Acceptance dimension | Evidence to collect |
| :--- | :--- |
| Engineering | Exact-SHA green lint/typecheck/test/build, plus selected browser and database integration |
| Booking | Real approved property, verified availability, payment expiry, cancellation and confirmation |
| Stripe | Approved sandbox/live-mode boundary, signed events, refund behavior and reconciliation |
| Owner & compliance | Genuine property rights/permits and independent owner/admin review |
| Finance | Payout destinations, statements, withheld funds, refunds and reconciled provider totals |
| Operations | Email delivery, document access, incident response, backups and operator sign-off |

This checklist is **not** a claim that any individual item has already passed.

## Documentation & design references

The checked-in audit is unusually detailed and valuable as a historical baseline. It was completed in **May 2026** and precedes later repository changes; treat its findings as research artifacts, then compare them with current source and a new test run.

| Area | Primary reference |
| :--- | :--- |
| Executive analysis | [Audit executive summary](./docs/audit/master-full-platform-review/00_EXECUTIVE_SUMMARY.md) |
| Architecture | [Repository and architecture audit](./docs/audit/master-full-platform-review/01_REPO_AND_ARCHITECTURE_AUDIT.md) |
| Roles and journeys | [Product and role-flow audit](./docs/audit/master-full-platform-review/02_PRODUCT_AND_ROLE_FLOW_AUDIT.md) |
| API and database | [Backend API audit](./docs/audit/master-full-platform-review/04_BACKEND_API_AUDIT.md) · [Data model audit](./docs/audit/master-full-platform-review/05_DATABASE_AND_DATA_MODEL_AUDIT.md) |
| Identity and security | [Auth/RBAC/security audit](./docs/audit/master-full-platform-review/06_AUTH_RBAC_SECURITY_AUDIT.md) |
| Payment and booking | [Stripe booking audit](./docs/audit/master-full-platform-review/07_STRIPE_PAYMENT_BOOKING_AUDIT.md) |
| Property owner & admin | [Owner portal audit](./docs/audit/master-full-platform-review/09_VENDOR_PORTAL_AUDIT.md) · [Admin portal audit](./docs/audit/master-full-platform-review/10_ADMIN_PORTAL_AUDIT.md) |
| Testing and infrastructure | [QA audit](./docs/audit/master-full-platform-review/13_TESTING_QA_AUDIT.md) · [Deployment audit](./docs/audit/master-full-platform-review/14_PERFORMANCE_SEO_DEPLOYMENT_AUDIT.md) |
| Risk and improvements | [Risk register](./docs/audit/master-full-platform-review/16_FINAL_RISK_REGISTER.md) · [Fix backlog](./docs/audit/master-full-platform-review/18_ACTIONABLE_FIX_BACKLOG.md) |
| Experience direction | [Design principles](./DESIGN.md) · [Motion direction](./DESIGN_MOTION_REVISION.md) |
| Communications | [Email deliverability](./docs/email-deliverability.md) |

**Documentation hygiene:** The former README linked to `docs/hardening/p0` and `docs/hardening/p1` reports that are **not present in this Git tree**. This version deliberately avoids presenting those missing artifacts as accessible source or present-day certifications.

## Contribution & ownership

This is a business-owned hospitality application. Keep work scoped, document behavior and migration effects, and preserve financial and tenant data:

1. Start from the intended source branch and record the baseline commit.
2. Change only the feature/documentation files in scope; never silently amend production credentials or records.
3. Run relevant checks and document anything blocked by provider or operational dependencies.
4. Obtain independent review for payment, data privacy, property approval, migration or payout behavior.
5. Use exact-SHA CI, deploy evidence and authorized operator acceptance rather than screenshots of unrelated older runs.

**License:** No repository-root `LICENSE` file was present in the inspected source tree. Public GitHub visibility does not grant a broad right to reuse or redistribute this software; consult the project owner for licensing terms.

---

<div align="center">

  <p><strong>LAUGH &amp; LODGE &nbsp; / &nbsp; RENT PROPERTY UAE</strong></p>

  <p><em>Hospitality is personal. The infrastructure behind it should be deliberate.</em></p>

  <p><a href="https://www.rentpropertyuae.com">Website</a> &nbsp;·&nbsp; <a href="https://github.com/laughlodgeseo/booking-marketplace">Source code</a> &nbsp;·&nbsp; <a href="https://github.com/laughlodgeseo/booking-marketplace/actions">CI &amp; checks</a> &nbsp;·&nbsp; <a href="#laugh--lodge">Back to top</a></p>

  <sub>Brand narrative, diagrams and metrics are descriptive; production authorization remains evidence-based.</sub>

</div>
