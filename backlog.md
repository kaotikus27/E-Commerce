# Backlog

Open, not-yet-scheduled work. Carried forward across sessions — check off and move to `handoff.md`/`DECISIONS.md` once actually picked up.

- [ ] No priced customization modifiers for products.
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
- [ ] `order.status` (customer tracking stepper) and `deliveryStatus` (Lalamove rider lifecycle) have no auto-sync — an admin must manually advance `order.status` even after the rider has picked up/delivered, or the customer-facing stepper looks frozen (see `docs/docsdebug.md`, ORD-TRACK-089). Either auto-advance `order.status` off `deliveryStatus` transitions, or make the stepper delivery-aware so it renders both.
- [x] ~~`OrderRepository.existsByGcashReference` (added in `f1eb8c7`) is unused~~ Wired into `placeOrder` (DEC-008, 2026-08-15).
