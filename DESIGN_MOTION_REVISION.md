# Laugh & Lodge — motion and composition revision

The first implementation repeated background-image heroes, small movement reveals,
left-image/right-copy layouts and decorative kickers. Those choices were rejected.
This revision is exclusively public frontend design. No API, backend, booking logic,
payment behavior or portal changes belong to this work.

## Research actually reviewed

- Current `muzammil-codeverse/Aegis-Senital/showcase/story-motion.js`,
  `editorial-motion.js` and `docs/CHOREOGRAPHY_RESEARCH.md`: measured continuity,
  physical layering, different route silhouettes and paired route shutters.
- `AEGIS_SENTINEL_CINEMATIC_DIRECTION_2026-10-18.md`: three major handoffs and
  deliberate quiet passages; scene names belong in internal direction, never UI kickers.
- Valtum master source, routine eyebrow prohibition and motion document's
  MOVE → HOLD → COUNTER-MOVE → OVERLAP → HANDOFF → RESOLVE → READ sequence.
- White Desert, Palomino and Lando Norris primary websites: photographic scale,
  scene pacing and route personality. Page text does not prove a specific animation.
- GSAP official ScrollTrigger and matchMedia documentation: measured travel,
  pin spacing, resize invalidation, media cleanup and anticipation of pin transitions.

## Concrete replacement

Home starts with city typography and a room aperture, rather than text pasted on
one background photo. Scroll opens the aperture to the actual interior; the city
and type leave through different planes. Search is a clearly named booking action.

Neighborhoods use one GSAP ScrollTrigger owner. Travel derives from track scrollWidth
minus viewport width. CSS never changes scene height following hydration. There is
no React state update in the scroll loop and no observer/height feedback cycle.
Controls use the same scroll clock; mobile uses native overflow and snap.

The room deck is three physical photographic planes. Incoming planes cross over the
preceding plane, while its scale and angle change. Each picture remains honest
editorial inspiration. Later care typography changes at reading speed, followed by
an independently moving photographic strip and a widening owner scene.

Services uses wide documentary scenes and a center-framed passage; owners uses a
centered architectural portrait and layered editorial notes; about assembles a city
panorama in three independently moving planes. These are different compositions,
not one hero wrapper with a different image. Pricing and contact remove the repeated
image-left/copy-right arrangement.

Navigation previews change photograph on pointer or keyboard focus. Paired shutters
handle ordinary public route changes; true selected-image carries retain their own
measured source/destination transition. Transactional links remain immediate.

## Scope and acceptance

No decorative kickers in public artwork. Functional form labels, gallery categories,
property metadata and image captions remain information, not section eyebrows.
Switzer, silver/graphite surfaces and green only for restrained functional emphasis.
Search owns its neutral field surfaces, including dropdowns; no cream gradients.

GSAP owns scene travel; Framer Motion owns local dialog/form composition and inner
image parallax. Lenis shares GSAP's ticker, with a native touch and reduced-motion
alternative. No WebGL, Playwright, fake properties, fabricated pricing or copied assets.

Check forward/reverse scrolling at the neighborhood boundaries, fast skipping, resize,
menu focus/Escape, search and calendar open states, Arabic, mobile, route return and
reduced motion. A successful build is engineering evidence, never an award score.

## Motion refinement, 18 October 2026

User approved the established identity and homepage hero. Preserve the hero composition and Switzer type, rather than selecting a new art direction. This pass concentrates motion in the supporting pages:

- Spaces: one measured horizontal photographic track with internal image countertravel.
- Owners: a dark horizontal narrative, preceded by the opening photograph widening as it enters view.
- Services: a layered vertical takeover; each new scene covers the previous one while it recedes.
- Gallery studies, journal, contact and pricing: staggered entrances for their actual content. Closing invitations resolve word by word. Homepage featured imagery opens its crop on approach.
- Footer: remove the separate 60svh image block. Return the interior as a compact, interactive doorway next to the final line. Crop opening, camera pullback and masked word arrivals share a scroll timeline. Credit: **By Valtum Studio**.

Each desktop journey uses a single pin and measured extent, with contextual previous/next and continue-below controls. Keyboard focus reveals its destination panel. Narrow screens use native horizontal swiping; reduced motion lays every panel out vertically, with all content visible. No new animation packages or media assets are needed. No backend or dashboard changes.

Navigation → existing hero → photographic narrative → closing invitation maintains the established page structure. There is no bento grid to randomize or fill, and no new eyebrow labels or hero decoration.
