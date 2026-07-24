# `AGENTS.md` — E-Commerce CX & Order-Flow Standards

## Purpose

This file is the standing rulebook for the ordering flow (menu → cart → checkout → payment →
tracking) in "Home by Bami." Any agent or developer touching cart, checkout, payment, order-status,
or admin-order-management code **must read this file first** and treat the checklist below as
acceptance criteria — not just for new features, but as regression guardrails for existing ones.

Two things live in this file, kept in sync:
1. **The Standard** — the CX Quality Checklist itself (Phases 1–6). This doesn't change often.
2. **The Compliance Snapshot** — an honest, evidence-based record of what the codebase actually does
   today against that standard, dated and re-auditable. This *does* change as gaps get fixed — update
   it in the same commit that closes a gap, don't let it go stale.

---

## The Standard: Customer Experience (CX) Quality Checklist

### 🛒 Phase 1 — Menu Browsing & Item Selection
Browsing must be fast, visual, and mistake-proof before items even reach the cart.
- [ ] Instant feedback on "Add to Cart" (cart count increments, toast, or bounce animation)
- [ ] Sold-out items handled gracefully — `available: false` products can't be added; button disabled,
      states "Sold Out for Today"
- [ ] Required customizations enforced — can't add to cart until a required choice is made
- [ ] Modifier price calculation — priced add-ons (e.g. +$0.70 Oat Milk) update the shown price live
- [ ] Cart persistence across refresh/close (localStorage or equivalent)

### 🛍️ Phase 2 — Cart Review & Pickup Timing
Prevent common ordering errors (wrong time, empty cart).
- [ ] Empty-cart safeguard — can't reach checkout with a $0.00/empty cart
- [ ] Quantity controls update subtotal/tax live, with no glitching; qty→0 removes the item cleanly
- [ ] Pickup time validation:
  - [ ] A pickup time must be selected
  - [ ] Can't select a time in the past or outside operating hours
  - [ ] Minimum lead time enforced (e.g. earliest slot is +15 min from now)
- [ ] Special preparation notes field (e.g. allergies), capped at a reasonable length (~150 chars)

### 📝 Phase 3 — Customer Information & Checkout
Keep forms ultra-short — social-traffic visitors bounce on friction.
- [ ] Guest checkout allowed — Name, Phone, Email only; no forced account/password
- [ ] Form validation & masking — phone format validated, email format validated, clean inline errors
- [ ] Double-submission prevention — submit button disables + shows a spinner immediately on click
- [ ] Order summary (total, item breakdown, pickup time) visible right next to the submit button

### 💳 Phase 4 — Payment Processing
Money must flow smoothly; failures handled politely.
- [ ] Payment method toggle (Online/E-Wallet vs. Cash on Pickup)
- [ ] On payment success → redirect to order tracking immediately
- [ ] On payment decline/cancel → stay on checkout with a clear message, cart preserved
- [ ] Cash on Pickup sets payment status to UNPAID without blocking order creation

### 📍 Phase 5 — Real-Time Order Tracking & Confirmation
Complete peace of mind while the order is being prepared.
- [ ] Unique, short order reference code shown to the customer
- [ ] Live status polling/WebSocket — Received → Preparing → Ready for Pickup → Completed,
      no manual refresh needed
- [ ] Store address, map link, and phone number shown on the tracking page itself
- [ ] Admin rejection reflected clearly on the tracking page ("Order Cancelled: [reason]") with
      next-step guidance

### 📱 Phase 6 — Mobile Responsiveness & Performance
Most traffic arrives from in-app social browsers.
- [ ] Facebook/Instagram in-app browser compatibility (iOS Safari view & Android Chrome view)
- [ ] Touch targets ≥ 48×48px on tappable controls (+, −, Add to Bag, etc.)
- [ ] No unintentional iOS zoom — form inputs use ≥16px base font size
- [ ] Fast image loading — menu images compressed (WebP preferred)

---

## Compliance Snapshot — audited 2026-07-24, updated 2026-07-24 (fix pass)

Legend: ✅ Pass · ⚠️ Partial · ❌ Gap

### Phase 1
| Item | Status | Evidence |
|---|---|---|
| Instant add-to-cart feedback | ✅ | `cart.service.ts` `addItem()` fires a success toast + opens the cart drawer immediately |
| Sold-out handling | ✅ | Fixed — `product-card.component.ts` and `item-modal.component.ts` both read `product.available`: Summon/Add button disabled + relabeled "Sold Out", thumbnail gets a "Sold Out for Today" overlay, `quickAdd()`/`addToCart()` early-return as a second guard |
| Required customizations enforced | ⚠️ | Unchanged — `item-modal.component.ts` still pre-selects `options[0]` for every customization, so a required field is never empty, but there's no explicit "you must choose" UI. Left as-is; the silent-default behavior is arguably acceptable, revisit only if product wants forced deliberate choice |
| Modifier price calculation | ❌ | Still not implemented — `Customization`/`CustomizationDto` have no price-delta field. This is the one deferred large item (see below) |
| Cart persistence | ✅ | Unchanged — `cart.service.ts` persists to `localStorage` via `effect()` |

### Phase 2
| Item | Status | Evidence |
|---|---|---|
| Empty-cart safeguard | ✅ | Unchanged — `checkoutGuard` |
| Quantity controls | ✅ | Unchanged, plus qty buttons now meet the Phase 6 touch-target requirement too (see below) |
| Pickup time — must select | ✅ | Unchanged |
| Pickup time — no past/closed times | ✅ | Fixed — `pickup-time-picker.component.ts` now checks `StoreService.isOpen()`; shows a "we're closed" message with zero slots when closed, and `generateSlots()` stops offering slots that would cross midnight closing. `cart-drawer.component.ts`'s checkout button and `checkoutGuard` both also block proceeding when the store is closed (defense in depth against direct `/checkout` navigation) |
| Pickup time — lead time enforced | ✅ | Unchanged — slots start ~20 min ahead |
| Special notes field | ✅ | Fixed — new "Special Instructions" step in `checkout-page.component.ts` (150-char textarea + counter), threaded through `OrderRequest`/`CheckoutService`/`OrderRequestDto`/`Order` entity/`OrderResponseDto`, shown on `order-confirmation.component.ts` and the admin orders board |

### Phase 3
| Item | Status | Evidence |
|---|---|---|
| Guest checkout, no password | ✅ | Fixed — Email field added alongside Name/Phone in `checkout-page.component.ts`; still no password required |
| Form validation & masking | ✅ | Fixed — `validateContactFields()` in `checkout-page.component.ts` regex-validates phone and email, sets per-field `nameError`/`phoneError`/`emailError` signals rendered as inline messages next to each input (backend `OrderRequestDto.guestEmail` also has `@Email` validation as a second layer) |
| Double-submission prevention | ✅ | Unchanged |
| Order summary near submit | ✅ | Unchanged — now also shows the selected pickup time in the review step (previously the picker's selection was never actually wired to the order at all — also fixed, see note below) |

### Phase 4
| Item | Status | Evidence |
|---|---|---|
| Payment method toggle | ✅ | Unchanged |
| Success → tracking redirect | ✅ | Unchanged |
| Decline → stay + clear message, cart preserved | ⚠️ | Unchanged — error-handling shape is correct but `tokenizePayment()` is still a stub that always resolves (no real gateway; deferred, see below) |
| Cash on Pickup → UNPAID, non-blocking | ⚠️ | Unchanged — no explicit `paymentStatus` field modeled; not touched in this pass |

### Phase 5
| Item | Status | Evidence |
|---|---|---|
| Unique order code | ✅ | Unchanged |
| Live status polling, no manual refresh | ✅ | Unchanged (fixed in the prior pass) |
| Store info on tracking page | ⚠️ | Fixed partially — `order-status-page.component.ts` now shows store name, address, and a "Get Directions" map link via `StoreService`. No phone number shown because none is configured anywhere in the system (`StoreService`/`StoreInfoDto.phone` is `""`) — showing a fake number would be worse than omitting it; add this once a real number exists |
| Rejection reflected with reason | ✅ | Unchanged (fixed in the prior pass) |

### Phase 6
| Item | Status | Evidence |
|---|---|---|
| In-app browser compatibility | — | Still not verifiable by code review — requires manual device/browser testing |
| Touch targets ≥48px | ✅ | Fixed for the checklist's explicit examples: cart-drawer `.qty-btn` (28px→48px) and item-modal quantity ± buttons (were 40px `.btn-sm`, now a dedicated 48px `.qty-btn` class). `.btn-sm` itself (40px, used for nav search/product-card Summon/admin buttons) was deliberately left alone — bumping it sitewide would meaningfully change density in the navbar and product grid; treat as a separate design decision if it's ever raised again |
| No iOS input zoom (≥16px) | ✅ | Fixed — `.field input/select/textarea` in `styles.css` bumped `15px→16px`; also fixed two raw inputs outside `.field` that had no explicit font-size at all (navbar search box, category-filter sort `<select>`), which risked inheriting a sub-16px UA default |
| Fast/WebP images | ⚠️ | Unchanged — admin uploads accept webp, seeded demo products still use raw Unsplash JPG URLs; not touched in this pass |

---

## Also fixed in this pass (found during implementation, not on the original checklist)

- **Pickup time selection was cosmetic** — `<app-pickup-time-picker>` emitted a `timeSelected` event that nothing listened to; `checkout-page.component.ts` hardcoded `pickupTime: '15 minutes from now'` regardless of what the customer picked. Now stored on `CartService.pickupTime` (signal), wired from the picker via `cart-drawer.component.ts`, and read by checkout. Checkout also now blocks submission with an inline error if no valid pickup time exists (e.g. store closed).

## Known gaps, in rough priority order

1. **No priced modifiers** (Phase 1) — needs a price-delta per customization option: model change (frontend `Customization`/backend `Customization` embeddable), seeder update, cart line-total math, and checkout total math on both ends. Meaningfully bigger than everything else on this list — treat as its own mini-project, not a quick fix.
2. **No real payment gateway** (Phase 4) — `tokenizePayment()` is an intentional stub; integrating a real gateway (Stripe/PayMongo/GCash) is a substantially bigger project requiring real merchant/API credentials from the business owner, not something to build speculatively.
3. **No phone number on the tracking page** (Phase 5) — blocked on there being an actual store phone number to show; add it the moment one exists (`StoreService.ts` + `StoreService.java` + `order-status-page.component.ts`).
4. **Required-customization "silent default" behavior** (Phase 1) — low priority, arguably fine as-is; only revisit if product explicitly wants to force a deliberate choice instead of a pre-selected default.
5. **Seeded demo images aren't WebP** (Phase 6) — low priority; only the demo/seed data, not a systemic issue (real admin-uploaded images already support webp).

Update the status column and this priority list in the same change that closes an item.
