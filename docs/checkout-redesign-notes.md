---
title: Checkout Page Redesign Notes
type: reference
status: in-progress
created: 2026-08-17
updated: 2026-08-17
ai_generated: true
---

# Checkout Page Redesign Notes

Design reference: `frontend/src/assets/home-cafe-bami-checkout.png` + Leo's written spec.
Compared against the current live implementation: `checkout-page.component.ts` + `delivery-map.component.ts`.
This is an analysis/planning pass only — **no code was changed** for this round.

## 1. Already built, restyle only

These exist and work today; the mockup only asks for a visual pass, not new logic.

- **Contact fields** (Full Name / Phone / Email) — already collected, already skips to "Ordering as {name}" when authenticated. Mockup's 3-column row vs. current stacked rows is layout-only.
- **Delivery pin map with drag-to-adjust** — `DeliveryMapComponent` already does exactly this (Leaflet + OSM, draggable marker, click-to-place, `confirmAdjustedPin()` flow). The pin icon is a plain `L.divIcon` rendering `📍` — trivially swappable for a themed icon (see §4).
- **GCash QR + account name/number + receipt upload** — all present (`store.gcashQrImagePath()`, `store.gcashAccountName()`, `store.gcashNumber()`, file input). Missing only the copy-to-clipboard button and drag-and-drop styling (cosmetic, see §3).
- **Order review with subtotal/tax/delivery fee/total** — present as "Step 5," just laid out as another stacked card instead of a sticky sidebar (see §2).
- **Special instructions / kitchen notes** — already exists (order-level `notes` field, reused for the cart-drawer per DEC-028). Mockup's "Delivery Notes / Landmark" is functionally covered by the existing `deliveryUnitDetails` field (rider gate/unit instructions).

## 2. Real layout change worth doing: sticky 2-column grid

Current: everything (contact → fulfillment → payment → notes → review) is one stacked column, max-width 640px, review card at the very bottom.

Mockup: order review lives in a **separate, sticky right column** — visible the whole time you're filling the form, which is a standard and genuinely useful checkout pattern (constant total visibility, less scrolling to confirm what you're paying).

**Recommendation:** restructure `.checkout-grid` into an actual 2-column CSS grid at desktop widths (`grid-template-columns: 1.6fr 1fr` or similar), single column on mobile with the review card either pinned to the bottom or collapsible. Move the "5. Order Review" card out of the form step list into a sibling `<aside class="order-summary">` with `position: sticky; top: 20px`.

## 3. Real, buildable UX gaps (small, additive)

- **Copy-to-clipboard button** next to the GCash/Maya account number — trivial (`navigator.clipboard.writeText`), matches the mockup's `[COPY]` button, no backend change.
- **Drag-and-drop styling** for the receipt upload — currently a bare `<input type="file">`. Can be upgraded to a real dashed drop-zone with `dragover`/`drop` handlers while keeping the same underlying file input for the "Browse Files" fallback and accessibility.
- **Upload confirmation state** — once a file is selected, show a checkmark + short confirmation line (mockup: "Receipt received!"). Already have `receiptFile()` signal to key this off of — just needs a template branch, no new state.
- **Total inside the CTA button label** — mockup shows `Place Order — ₱517.00`; current button just says "Place Order." Cosmetic, data already available via `estimatedTotal()`.
- **Trust line under the CTA** ("Safe & secure order," etc.) — purely decorative, no data dependency, safe to add with generic (non-fictional) copy.

## 4. Feasible visual reskin — map pin only, not the map itself

The mockup's map is a **hand-illustrated fantasy village**, not a real map. That can't be adopted as-is: the real Leaflet/OSM map is showing actual streets so the customer (and the rider) can verify a real location — replacing it with stylized art would break the one thing this component exists to do.

**What's realistically portable:** just the *pin icon*. `DeliveryMapComponent`'s `pinIcon` is already a `divIcon` (arbitrary HTML/image), so swapping the plain `📍` for a small custom illustrated pin (if Leo commissions/uploads one) is a low-risk, cheap visual win — the map itself, tiles, and drag behavior stay real and unchanged. The map's outer frame (border-radius, border color) can also pick up the same warm-oak border treatment already used on the item-modal/cart-drawer (DEC-030/034) for visual consistency, without touching the map internals.

## 5. Needs an explicit decision: structured address form vs. current free-text search

This is the biggest real divergence, and not just a style question.

**Current implementation:** one free-text search field ("Search Subdivision / Landmark / Barangay," accepts a pasted Google Maps link too) → backend geocodes it → if ambiguous, shows candidate buttons to disambiguate → returns a quote + map pin to fine-tune. This exists because of a deliberate earlier decision (DEC-001) to avoid Google Places Autocomplete's paid tier — geocoding a single free-text string server-side, not structured-field autocomplete, is the reason there's no per-keystroke billing risk.

**Mockup:** 7 discrete labeled fields (House/Unit, Street, Subdivision, Barangay, City, Province, Zip, Delivery Notes) — a standard PH structured address form, no live geocoding-as-you-type implied.

These aren't reconcilable by restyling alone — they're two different address-collection strategies:

- **Option A — keep free-text search, restyle only:** cosmetic pass (bigger textarea → styled input group, terracotta "Find My Location" button), no backend change. Loses the mockup's structured-field precision but keeps the existing, already-tested geocoding flow untouched.
- **Option B — add structured fields as a frontend layer over the same backend:** collect the 7 fields, concatenate them into one search string before calling the existing `delivery.getQuote()` API unchanged. Gets the mockup's cleaner data-entry UX without touching the backend or the Lalamove/geocoding integration at all. Some duplication risk (structured fields not visible to backend if it fails to disambiguate, and the free-text-driven candidate-picker UX would need to work from a concatenated string rather than one thing the user directly typed).
- **Option C — actually change the backend to accept structured fields:** most faithful to the mockup, but nontrivial: touches `OrderRequestDto`/the geocoding call itself, and reopens the Google Places Autocomplete-cost question DEC-001 specifically avoided.

**Recommendation:** Option B is the sweet spot — gets the visual/UX win from the mockup without reopening a settled architectural decision or touching the backend.

## 6. Missing feature the mockup assumes exists: promo/discount codes

The mockup's order summary includes a **redeemable coupon code** applied at checkout ("CHILL10, -₱48.00"). Nothing like this exists today — the site's `Promotion` model (DEC-017) is a homepage marketing banner only, not a code a customer types in and redeems for a computed discount on their specific order.

This is a real, standalone feature (new backend field/validation for a promo code, discount computation, display in the review card) — bigger than a checkout-page facelift. Flagging it here as a **backlog candidate**, not something to build as part of a "restyle the checkout page" pass.

## 7. Naming/copy — same pattern as every other redesign round

Per the established convention (DEC-018, DEC-027, DEC-028): generic labels instead of the mockup's literal Ghibli character references.

| Mockup | Use instead |
|---|---|
| "Wanderer Info" | "Your Details" / "Contact Info" (already the current label) |
| "🎖️ Soot Sprite Approved" / "No Face Approved!" badges | Drop — decorative flourishes with no real meaning, tied to specific characters |
| "YOUR SPIRIT BASKET" | "Order Summary" / keep cart drawer's "Your Cart" |
| "PLACE MAGICAL ORDER" | "Place Order" (already the current label) |
| "Kamaji is preparing your magical boiler room" | "Receipt received — we'll verify it shortly" |
| "50% Sugar (Kamaji's Choice)" style option labels | Already generic in the real data (`Regular`, `Standard Ice`, etc. — DEC-028) |

## 8. UI/UX designer notes (beyond 1:1 mockup matching)

- **Form validation timing:** current implementation validates on submit only (`submitOrder()` sets field errors after a failed attempt). Consider inline/on-blur validation for phone/email so errors surface before the customer reaches the bottom of a long form — reduces the "fill everything, get rejected at the end" frustration a single-column checkout is prone to.
- **Progressive disclosure is already good** — fulfillment-type-dependent fields (delivery box, GCash box) only render when relevant. Keep this pattern for any new structured-address fields (§5) rather than always showing all 7 at once regardless of fulfillment type.
- **Sticky summary accessibility:** if §2 is implemented, make sure the sticky sidebar doesn't trap keyboard focus or create an awkward tab order on mobile where it collapses to the bottom — test tab order explicitly, not just visual placement.
- **Delivery quote countdown** (`formattedCountdown()`) is a nice touch already built — consider surfacing it more visually (e.g., a small colored badge) since an expired quote silently blocking order placement is exactly the kind of thing a rushed customer misses in plain text.
- **Error messaging density:** `errorMessage()` is a single generic string ("Please fix the highlighted fields above") separate from the specific field errors. Fine for now, but if the form grows (structured address = 7 more required fields), consider scrolling to / focusing the first invalid field on submit rather than relying on the customer to scan the whole page.
- **Trust signals** (mockup's "🔒 Safe & Secure Order") are cheap and worth keeping — but back them with something real if possible (e.g., a small note that receipts are only visible to store staff) rather than a generic reassurance with no substance.

## Suggested next step

Given the size of this (layout restructure + a real architectural decision on §5 + a net-new feature in §6), recommend splitting into separate passes rather than one big "redo checkout" session:

1. ~~Visual restyle pass (§1, §3, §4's pin/frame, §7 copy)~~ **Done (2026-08-17, DEC-035).** Bespoke palette applied throughout; copy button, drag-and-drop upload zone + confirmation state, total-in-CTA-label, trust line, and the map's wood-board frame all built and verified live. Map tiles/drag behavior intentionally untouched.
2. ~~Layout restructure (§2 sticky sidebar)~~ **Done (2026-08-17).** `.checkout-grid` is a sticky 2-column grid at ≥900px (Order Review + CTA + trust line moved into a right-hand `<aside>`), single column below that. Verified live.
3. ~~Address-form decision (§5)~~ **Done (2026-08-17) — Option B chosen.** 7 structured PH address fields (House/Unit, Street, Subdivision, Barangay, City, Province, Zip, Delivery Notes) collected in the UI, concatenated into the same free-text search string the existing geocoding backend expects — no backend change. An optional "Have a Google Maps link instead?" field preserves the old paste-a-link shortcut, overriding the structured fields when filled. Verified live against the real backend: both the concatenated-fields quote and the Maps-link-override quote returned real fees.
4. ~~Promo codes (§6)~~ **Done (2026-08-17).** New `PromoCode` backend entity/endpoints, admin CRUD at `/admin/promo-codes`, and an Apply/Remove promo input in the checkout Order Review sidebar — discount resolved authoritatively server-side at order placement, never trusted from the client. See `backlog.md` for the full write-up and a caveat about live browser verification.
