# Laugh & Lodge — The Inside Story

Public experience only. Protected `(portal)` pages, portal components, global tokens,
API contracts, and policy content are preserved.

## World

The city becomes personal from inside a home. Photography is the material;
architectural frames and shifting crops connect discovery, care and ownership.
The closing phrase is COME ON IN. Distinct route modes: cinematic home,
photographic archive, documentary services, editorial owners/about,
fast discovery, focused authentication, calm checkout and legal reading.

## Tokens and ownership

`apps/web/components/inside-story/story.css` owns public tokens scoped to
`.inside-story` and `.auth-shell`. Do not move these overrides to `:root`.
Graphite #151C1D; silver #F3F5F4; palm #38584A; secondary #53615C;
limestone #CED5D2. Photography supplies warmth. Switzer via Fontshare CDN,
existing Arabic font retained for compatibility; no new font assets redistributed.
No purple, orange, cream, glow, glass, badges, repeated feature-card templates.

## Components

`Motion.tsx`: bounded image parallax, reduced motion, route entry.
`HomeStory.tsx`: photographic opening, native horizontal district journey,
care and owner scenes. `FeaturedStays.tsx`: real inventory only; authored unavailable state.
`FloatingHeader`: native modal dialog, keyboard focus restoration, role links, locale.
`Footer`: typographic conclusion, real contact and existing compliance disclosures.
Existing search/calendar/booking/forms retain business behavior.

## Motion and mobile

Use direct manipulation and measured image crops, not opacity-hidden content.
Photographs remain readable without JavaScript. Native horizontal scroll with
buttons and keyboard access; asymmetric desktop imagery becomes one district
per mobile swipe. Reduced motion removes parallax and route entry movement.
Never delay form submission or a booking for a decorative transition.

## Verification

Run web typecheck, lint, tests and build; inspect real routes in browser on wide
and narrow viewports. Never use Playwright. Validate offline inventory, menu
keyboard handling, locale switching, auth form transitions and search URLs.
No self-assigned award scores. Railway outage means transaction success cannot
be established from a frontend build.

## Revision: architectural continuity

See `DESIGN_MOTION_REVISION.md`. `second-direction.css` owns the revised
public compositions; `choreography.ts` supplies scoped GSAP lifecycle. No marketing
eyebrows. Each route needs its own composition, not a background-photo hero template.
Lenis and GSAP share one clock; horizontal travel is measured without React
scroll-state or hydration-driven height switching. Backend work is out of scope.
