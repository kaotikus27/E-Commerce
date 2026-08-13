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
