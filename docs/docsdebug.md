# Debug Log

Running log of bugs actively under investigation. Newest entry at the top. Each entry starts
with a title from Leo, then gets filled in as we investigate — symptom, what was checked, what
was found, and how (or whether) it was fixed.

---

## [Bug title goes here]

- **Opened:** YYYY-MM-DD
- **Status:** investigating / root-caused / fixed / deferred / can't reproduce
- **Symptom:** What Leo actually sees.
- **Investigation:** What was checked and where — files read, requests traced, repro attempts.
- **Root cause:** Once known.
- **Fix:** What changed, and how it was verified (not just "should work now").

---


# [BUG] Order Status Stuck in `ASSIGNING_DRIVER` Due to Unhandled Lalamove Webhook Event in Spring Boot Service

**Ticket / Ref ID:** LALA-INTEG-044  
**Date Reported:** 2026-08-13  
**Severity:** [ ] Blocker  |  [x] Major  |  [ ] Minor  |  [ ] Cosmetic  
**Environment:** [x] Staging / Sandbox  |  [ ] Production  
**Tech Stack / Module:** Spring Boot (Backend) / Angular (Frontend) / Lalamove Webhook Module  

---

### 📝 Issue Description
When placing a customer order on the Live Orders dashboard, the order status defaults to `ASSIGNING_DRIVER`. Manually triggering order actions (such as assigning a driver or picking up the order) in the **Lalamove Partner Portal Sandbox** updates Lalamove's internal record, but our system fails to sync this change. The Angular UI remains locked in the `ASSIGNING_DRIVER` state with the **"Mark Ready"** button disabled.

---

### 🔄 Steps to Reproduce
1. Dispatch an order from the merchant dashboard to Lalamove.
2. Confirm the order appears in the Angular Live Orders dashboard with status `ASSIGNING_DRIVER`.
3. Open the **Lalamove Partner Portal (Sandbox)** under `Records` and search for the active order ID.
4. Select an action in the dropdown (e.g., set status to `ASSIGNED` or `PICKED_UP`).
5. Return to the Angular dashboard and observe the order status card.
6. *Observe:* The status stays `ASSIGNING_DRIVER` and does not reflect the update made in Lalamove.

---

### 🎯 Expected Behavior
1. Lalamove sends an HTTP `POST` webhook notification (`ORDER_STATUS_CHANGED`) to our Spring Boot REST endpoint when the status changes in their portal.
2. The Spring Boot backend parses the payload, updates the order entity status in the database, and publishes the update (via WebSocket, SSE, or poll response).
3. The Angular RxJS stream receives the state update, transitions the UI status away from `ASSIGNING_DRIVER`, and enables the **"Mark Ready"** button.

---

### ❌ Actual Behavior
The Spring Boot backend does not process or persist the status update from the Lalamove callback. The Angular UI continues to render `ASSIGNING_DRIVER` indefinitely.

---

### 🔍 Technical Details & Investigation

* **Frontend (Angular):**
  * Component: `LiveOrdersComponent` / `OrderCardComponent`
  * State Stream: `BehaviorSubject<OrderDto[]>` inside `OrderService`
  * Issue: Receives no new state emitted from the backend REST/WebSocket pipeline.

* **Backend (Spring Boot Java):**
  * Controller Endpoint: `@PostMapping("/api/v1/webhooks/lalamove")` inside `LalamoveWebhookController`
  * Service Layer: `LalamoveWebhookServiceImpl`
  * Root Cause Hypotheses:
    1. **Webhook Inaccessibility in Sandbox:** The local/staging Spring Boot application port is not publicly accessible to Lalamove's sandbox servers (e.g., missing Ngrok tunnel or invalid domain binding in Lalamove App Settings).
    2. **Payload Deserialization Error:** Jackson fails to deserialize Lalamove's incoming JSON body into the expected `LalamoveWebhookPayloadDTO` due to missing or mismatched field mappings (`ORDER_ASSIGNED`, `REJECTED`, `PICKED_UP`).
    3. **Missing Local Status Mapping:** `LalamoveWebhookServiceImpl` receives the payload but fails to map Lalamove status strings (`ASSIGNED`, `ON_GOING`, `PICKED_UP`) to internal enum values (`DRIVER_ASSIGNED`, `READY_FOR_PICKUP`).
    4. **Lack of Fallback Polling:** The system relies strictly on webhooks without a fallback `@Scheduled` Spring task calling `GET /v3/orders/{order_id}` via `WebClient` / `RestTemplate` to fetch the status.

---

### 📸 Screenshots & Attachments
* **Order UI:** `#ORD-179842` showing status `ASSIGNING_DRIVER` and disabled *"Mark Ready"* button.
* **Lalamove Portal:** Order `3560616062750396511` marked as `Picked Up`.

---

### 📋 Definition of Done (Acceptance Criteria)
- [ ] Verify `LalamoveWebhookController` receives incoming `POST` requests in the Spring Boot log file.
- [x] Ensure Jackson properly deserializes Lalamove event types (`ASSIGNED`, `ON_GOING`, `PICKED_UP`, `COMPLETED`).
- [x] Verify JPA updates the `Order` entity's status field in PostgreSQL/MySQL upon webhook receipt.
- [x] Ensure Angular `OrderService` reflects the updated status in the UI components without requiring a full manual page refresh.
- [ ] Implement a fallback manual "Refresh Delivery Status" feature or Spring `@Scheduled` poll to query `GET /v3/orders/{id}` if webhook callbacks fail in sandbox testing.

---

### ✅ Investigation Findings (2026-08-13)

- **Status:** fixed (see "Fix" and "Frontend wired up" sections below). Not a new defect — this is
  the same thing already diagnosed in a prior session as `handoff.md` Open Issue 10, re-triggered
  because the fix for it (a public tunnel) was never actually set up.
- **Confirmed live:** `GET /api/v1/orders/ORD-179842` right now still shows
  `deliveryStatus: "ASSIGNING_DRIVER"`, `driverName: null` — matches the report exactly. This is a
  real, currently-stuck order, not a one-off.
- **Ruled out (hypotheses 2 & 3 — deserialization / status mapping):** Read
  `LalamoveWebhookController.java` end to end. It doesn't use a brittle `LalamoveWebhookPayloadDTO`
  at all — it walks the raw JSON with Jackson's `JsonNode` directly, and `DeliveryStatus` enum
  values (`ASSIGNING_DRIVER`, `ON_GOING`, `PICKED_UP`, `COMPLETED`, `REJECTED`, `CANCELED`) are
  spelled identically to Lalamove's own wire strings, parsed via a plain `DeliveryStatus.valueOf(...)`
  — so there's no mapping table to get out of sync. This exact path was already proven to work
  end-to-end against real orders in a prior session (Open Issues 8 & 9 — a signed local webhook
  call flipped `ASSIGNING_DRIVER → ON_GOING → PICKED_UP → COMPLETED` on real order data, confirmed
  via `GET /api/v1/orders/:id` after every step). Not re-run this session since it was already
  conclusively proven.
- **Ruled out (frontend not reflecting state):** `admin-orders-board.component.ts` runs
  `setInterval(() => this.orderService.loadOrders(), POLL_MS)` — it already auto-polls the backend,
  plus there's a manual "Refresh" button. If the backend's own DB had the updated status, the UI
  would show it within one poll interval. It doesn't, because the DB never gets updated in the
  first place (see below) — the frontend isn't the broken link.
- **Confirmed (hypothesis 1 — webhook unreachable):** No `ngrok`/`cloudflared` process is running
  on this machine (`Get-Process` — nothing matched), and nothing in the codebase auto-registers a
  public URL with Lalamove. The backend listens on `localhost:8080` only. Lalamove's sandbox
  servers run in Lalamove's own cloud and physically cannot reach `localhost` on this machine —
  so any status change made by hand in the **Lalamove Partner Portal** never arrives as a webhook
  call at all. `LalamoveWebhookController.logIncomingRequest()` logs every single incoming
  request unconditionally, so "check the Spring Boot log for a POST" (acceptance criterion 1) will
  come back empty — not because logging is broken, but because nothing ever arrived to log.
- **Root cause:** Lalamove's webhook events are POSTed to whatever URL is registered in the
  Lalamove sandbox dashboard. Right now that's either unset or pointing at nothing reachable, since
  there's no tunnel exposing this machine's `localhost:8080` publicly. Portal-side actions update
  Lalamove's own record only — our backend is never told. By design of the current dev setup, not
  a code bug.
- **Not evaluated this session:** whether Lalamove's own webhook-delivery retry/backoff would even
  still redeliver an old event after a tunnel is set up later — likely not; a webhook missed while
  unreachable is probably gone for good, so this order will likely need a manual status fix (or a
  fresh dispatch) rather than "just add a tunnel and it'll catch up."

**Two independent ways to close this**, not mutually exclusive:
1. Set up a public tunnel (ngrok / Cloudflare Tunnel) to `localhost:8080` and register that URL as
   the webhook endpoint in the Lalamove sandbox dashboard — makes the *real* Lalamove Partner
   Portal test flow in this bug report actually work end-to-end.
2. Build acceptance criterion 5 (fallback poll / manual "Refresh Delivery Status" hitting
   Lalamove's own `GET /v3/orders/{id}`) as a permanent resilience feature — useful even *with* a
   tunnel, since webhook delivery over the internet is never 100% guaranteed.

Until one of those lands, use `backend/scripts/simulate-lalamove-webhook.js` to test the
webhook-handling code path locally (bypasses the reachability problem entirely, per its own
header comment).

---

### 🔧 Fix (2026-08-13, same session)

Built option 2 (fallback poll / manual sync) per Leo's `PROPOSAL.md`, plus the idempotency guard
it correctly flagged as a prerequisite. Skipped the tunnel/cron pieces of the proposal for now —
see review notes below.

**Changed:**
- `DeliveryStatus.fromLalamove(String)` — shared status-string parser (was duplicated private
  logic in `LalamoveWebhookController`; both the webhook and the new sync path now call the same
  one).
- `OrderService.applyDeliveryWebhookUpdate()` — added an ordering/terminal-state guard. Once an
  order is `COMPLETED`/`REJECTED`/`CANCELED`, every further update (status *and* driver info) is
  ignored outright. Otherwise a stale/out-of-order status update is ignored unless it's forward
  progress or one of the two terminal exits (`REJECTED`/`CANCELED`, which always win). Needed
  because there are now two independent writers (webhook push, manual pull) with no guaranteed
  ordering between them.
- `LalamoveClient.getOrder()` / `.getDriver()` — new signed GET calls (`/v3/orders/{id}`,
  `/v3/orders/{id}/drivers/{driverId}`) reusing the existing `signedRequest()` infra. Driver
  name/phone/plate need the second call — Lalamove's order-details response only has `driverId`.
- `OrderService.syncDeliveryStatus(orderNumber)` + `PATCH /api/v1/admin/orders/{orderNumber}/sync-delivery-status`
  (admin-gated, same as the existing dispatch endpoint) — pulls current status/driver from
  Lalamove and feeds it through the *same* guarded `applyDeliveryWebhookUpdate()` path the webhook
  uses, so there's exactly one place that decides whether an update is safe to apply.

**Verified live**, all against the real order from this bug report (`ORD-179842` /
`3560616062750396511`), against Lalamove's real sandbox API (not simulated):
1. `PATCH .../sync-delivery-status` → real sandbox call returned `PICKED_UP` (matches what Leo
   set in the Lalamove Partner Portal) + real driver info (`TestDriver 34567`, sandbox test
   data) → both persisted correctly.
2. Called it again → idempotent, no change.
3. Sent a simulated stale `ON_GOING` webhook (earlier than `PICKED_UP`) → correctly ignored,
   status stayed `PICKED_UP`. Backend logged `Ignoring out-of-order status ON_GOING ... current
   status PICKED_UP is already further along.`
4. Sent `CANCELED` → correctly applied (terminal exit always wins) → status became `CANCELED`.
5. Sent `ON_GOING` again → correctly ignored (order now terminal) → stayed `CANCELED`.

**Known side effect of testing:** step 4/5 above left `ORD-179842` as `CANCELED` in the local DB,
which no longer matched Lalamove's real sandbox record (`PICKED_UP`) — a deliberate test action,
not a bug, but the new terminal guard correctly refused to let anything resync it automatically.
**Fixed (2026-08-13, later same session):** corrected directly via the H2 console (`UPDATE orders
SET delivery_status='PICKED_UP' WHERE order_number='ORD-179842'`) — the app-level guard is
supposed to block exactly this kind of update through its normal paths, so a raw DB fix was the
only way to correct a test artifact without weakening the guard itself. Verified via both the H2
console read-back and `GET /api/v1/orders/ORD-179842` — `deliveryStatus` and `driverName` both
confirmed correct.

**Reviewed but deliberately not built this session** (see the PROPOSAL.md review in chat):
- The proposal's Cloudflare-tunnel example (`cloudflared tunnel --url ...`) is the *ephemeral*
  quick-tunnel mode — it gets a new random URL every run, which doesn't actually solve "URL
  breaks on restart." A real persistent tunnel needs an owned domain + named tunnel setup. Not
  worth checking into the repo either way — a tunnel URL is inherently per-session.
- No cron/background auto-poll for stuck orders — manual "Refresh Delivery Status" only, for now.
- Setting up the actual tunnel + registering it in the Lalamove sandbox dashboard, so the real
  Partner-Portal-triggered webhook path works — still an open manual step (Open Issue 10).

**Frontend wired up and verified live in the real browser (2026-08-13, later same session):**
Added a "🔄 Refresh Delivery Status" button to `admin-orders-board.component.ts` (shown next to
the delivery-status badge whenever `deliveryStatus` isn't terminal — `isDeliveryInProgress()` —
so it's correctly absent on already-finished/canceled orders) plus `syncDeliveryStatus()` in
`AdminOrderService`. Verified end to end in Chrome, not just via curl: logged in, opened Live
Orders, confirmed the button was present on the in-progress order (`ORD-115748`,
`ASSIGNING_DRIVER`) and correctly absent on the terminal one (`ORD-179842`, `CANCELED`), clicked
it, and watched `ORD-115748` update live in the UI — `ASSIGNING_DRIVER → ON_GOING`, real driver
info populated, and "Mark Ready" flipped from disabled (with its "waiting for driver" hint) to
enabled, since `canMarkReady()` reads the same `deliveryStatus`/`driverName` fields. No console
errors. Status: **closed** — both the code path and its UI are now built and verified.