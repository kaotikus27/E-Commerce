# Backlog

Open, not-yet-scheduled work. Carried forward across sessions — check off and move to `handoff.md`/`DECISIONS.md` once actually picked up.

- [x] ~~No priced customization modifiers for products~~ Admin can now set a per-option surcharge (e.g. Oat milk +₱20) per product; priced server-side at order placement (DEC-012, 2026-08-15).
- [ ] No dedicated refund UI for `PaymentStatus.REFUNDED`.
- [ ] No phone number field on the customer order-tracking page.
- [ ] Category restructure (4 categories → 3) — still undecided.
- [ ] Wallet-balance visibility in admin — the `WALLET_BALANCE_CHANGED` webhook is received but not persisted or shown anywhere.
- [ ] Lalamove cancel-and-clone order replacement (`ORDER_REPLACED` event) not handled — `applyDeliveryWebhookUpdate()` looks up strictly by the original `lalamoveOrderId`, so a replaced order's updates would silently stop applying.
- [ ] No way to check Lalamove wallet balance before dispatch — a dispatch can fail with a real `402 insufficient credit` with no advance warning.
- [ ] Sales Summary admin page — planned, not yet built.
- [ ] Satellite-view toggle (carried over from an earlier session, still untouched).
- [ ] Build Rail roadmap artifact update (carried over from an earlier session, still untouched).
- [ ] `lalamoveOrderId` isn't exposed by any admin API/UI — the only way to look it up today is a raw H2-console SQL query (see `backend/scripts/simulate-lalamove-webhook.js` header for the exact steps). Worth surfacing on the admin order view.
- [ ] No cron/background auto-poll for orders stuck in `ASSIGNING_DRIVER` beyond N minutes — DEC-006 only covers manual/on-demand sync.
- [ ] Cloudflare quick tunnel (`*.trycloudflare.com`) for the Lalamove webhook is not durable — its URL changes every restart and must be re-registered in the Lalamove sandbox dashboard each time (see `docs/lalamove-webhook-tunnel.md`). A named Cloudflare tunnel would fix this permanently but isn't set up yet.
- [x] ~~`order.status` (customer tracking stepper) and `deliveryStatus` (Lalamove rider lifecycle) have no auto-sync~~ Auto-advance wired in `syncOrderStatusFromDelivery()` (DEC-010, 2026-08-15).
- [x] ~~Stepper still isn't delivery-aware~~ Delivery orders now get their own 5-step sequence reflecting Lalamove's real lifecycle (DEC-011, 2026-08-15).
- [x] ~~`OrderRepository.existsByGcashReference` (added in `f1eb8c7`) is unused~~ Wired into `placeOrder` (DEC-008, 2026-08-15).
- [ ] Home page "Our Philosophy" section (DEC-015) has a blank image placeholder — the source mockup itself has no image in that slot, so an actual photo/illustration asset is needed from Leo before it can be swapped in.
- [ ] Testimonials section (Ghibli redesign) still uses placeholder names copied from actual Studio Ghibli characters (Sophie Hatter, Chihiro Ogino) — swap to real customer names once that section is built.
