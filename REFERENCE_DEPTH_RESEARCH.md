# Laugh & Lodge — depth, motion and navigation revision

18 October 2026. Research and implementation notes for the approved Inside Story identity. Public frontend only. The homepage hero composition and typography remain unchanged.

## Reference observations and decisions

| Reference                                               | Evidence reviewed                                                                                                                                                                               | Useful principle                                                                                                            | Translation into this site                                                                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Fitosauna](https://fitosauna.com/)                     | Live opening, complete homepage structure, public theme animation source (`app.js`): pinned information columns, measured horizontal movement, crop reveals, inner-image travel and masked text | Practical information can be the material of an extended visual narrative                                                   | Planning and owner-onboarding sequences combine readable information, a drawing rule, expanding image crops and direct next actions. No imported health claims or product statistics.                                     |
| [Belgrade Arbor](https://belgradearbor.rs/en)           | Live loader/opening transition; public homepage architecture: location, residences, living, amenities and views                                                                                 | A place supports several meaningful editorial perspectives, rather than one generic feature grid                            | Add neighborhood field notes, interior atmosphere, guest routines and owner preparation. The observed slow loader is a caution: ours is bounded and does not wait for below-fold images. No imported 3D scene.            |
| [Neutomni](https://neutomni.com/)                       | Live typographic composition and public section structure; source declares GSAP, SplitText and Lenis                                                                                            | Typography, material changes and process information make a page feel authored                                              | Word-paced statements, alternating light/dark acts, contextual explanations and connected routes. Avoid importing the studio’s visual identity, badges and package/pricing metaphors.                                     |
| [Terminal Industries](https://terminal-industries.com/) | Live cinematic truck opening; official indexed page structure (direct HTML request returned 403)                                                                                                | The object of the business stays connected to its practical use; information expands by audience and operation              | Distinguish the guest’s planning questions from the owner’s preparation questions. Give services a timeline of before arrival, arrival and during the stay. No fabricated calculator, performance figures or brand logos. |
| [Palomino](https://palominoprod.com/en)                 | Live opening and scroll into projects/figures; official public section structure                                                                                                                | Image scale, editing and pauses vary across a longer page                                                                   | A photographic collage, unequal reading-card proportions, paired full-screen image handoff and a quiet FAQ interval. Do not copy unsupported counters or testimonial content.                                             |
| [White Desert](https://white-desert.com/)               | Live opening, media-to-editorial transition and trip introduction; official content including camps, journey logistics and planning                                                             | Immersion resolves into useful specifics, then expands into another scene; large images and readable explanation take turns | A city-to-room curtain transformation, then practical planning and reading. The location remains the protagonist; no imitation of its Antarctic map or expedition data.                                                   |

The user’s Animation document specifies multi-plane motion and the rhythm MOVE → HOLD → COUNTER-MOVE → OVERLAP → HANDOFF → RESOLVE → READ. The reference corpus also emphasizes that real information is better motion material than decoration, and that slow/repeated loaders damage the experience. Those principles guide this revision.

## Added information architecture

- **Home:** approved opening/search → stay-style selector → district journey → city field notes → actual featured inventory/fallback → city-to-room handoff → room sequence → practical planning → hospitality/owner perspective → journal reading → booking questions → footer.
- **Owners:** existing hero and narrative → the character of a home → property-specific onboarding steps → owner questions → connected services/contact routes → final invitation.
- **Services:** existing hero and service takeover → detail photography and the meaning of care → before/arrival/during sequence → guest questions → connected discovery.
- **About:** existing company story → city-to-room handoff → guest/owner perspectives → planning guidance → connected routes. Registered company information remains intact.
- **Spaces:** photographic track → material/detail essay → selectable daily routines → explicit editorial-versus-bookable distinction → actual stays route.
- **Pricing:** existing pricing explanation → planning and comparison sequence → practical rate/fee/policy questions → discovery routes. No invented quotes or fee amounts.
- **Contact:** existing address and submission behavior → a calmer form presentation → enquiry preparation for guests/current reservations/owners → readable questions.
- **Journal and studies:** longer useful articles, related reading and contextual discovery. Search retains its actual controls/results before supporting information.

At least seven additional photographs are brought into the public narrative from existing WebP assets. Interiority images remain editorial; city images use the existing Dubai area assets. No stock photograph is presented as a particular bookable home. EN/AR copy is provided for the new primary sections. Existing journal articles remain English and are identified accordingly in Arabic navigation.

## Motion mechanics

- A full-width city frame transfers ownership to a living-room image through a vertical curtain; inner crop and typography move independently.
- Three photographic planes drift at different rates in the collage. Text resolves word by word; crop reveals have separate timing.
- Planning rows draw a rule, open an image from the center and resolve a heading, then hold readable body text.
- Stay-style buttons select actual text and photographs. They are native buttons with a visible selected state; links lead to real search/contact routes.
- Unequal reading cards use counter-parallax and image zoom on hover. Links remain usable without animation.
- Touch screens use native scrolling. Reduced-motion mode keeps both handoff scenes in normal flow and removes pinning, sweeps and decorative motion.

## Navigation defect diagnosis

The reported return-home crash was reproduced from the bottom of the owner page. The captured browser exception was `NotFoundError: Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.` This is a frontend DOM-reconciliation failure, not an API response.

ScrollTrigger previously pinned React-owned section roots directly. The fix pins internal stage elements while preserving stable outer sections. Before an intercepted animated route is committed, existing pins are reverted. The capture handler stops propagation so the same click cannot also execute Next Link’s navigation handler. Native modified clicks and excluded transactional/protected routes retain normal behavior. The menu receives an explicit departure event.

The outgoing Lenis controller is stopped and reset before committing navigation. The destination resets scroll before paint, then refreshes measurements and resumes. Hash links retain their anchor behavior. This directly addresses the old smooth-scroll target carrying the visitor back down the new route.

References for engineering decisions: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP context cleanup](<https://gsap.com/docs/v3/GSAP/gsap.context()/>), [Next Link](https://nextjs.org/docs/app/api-reference/components/link). Basic district context was cross-checked against [Visit Dubai](https://www.visitdubai.com/en/travel-trade/explore-dubai/dubai-neighbourhoods).

## Loader and footer

The initial loader uses the same architectural doorway and wordmark, with a progress line driven to completion after fonts/priority imagery are ready. It does not display a fabricated percentage and does not wait for all new below-fold photographs. Readiness has a deadline; a CSS escape prevents a permanent loading screen if JavaScript fails. Subsequent route loading uses the existing transition cover and a branded route fallback.

Footer credit remains exactly **By Valtum Studio**, with no underline. The compact doorway and final line remain in place.
