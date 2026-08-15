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

## [BUG] Static info pages (About/Contact/FAQ/Terms) and the Shop product list render blank on first paint

- **Opened:** 2026-08-15
- **Status:** root-caused (partially), NOT fixed — deferred pending owner input
- **Symptom:** Discovered during a full-site regression pass after the Ghibli home page redesign
  (unrelated to that work — see Investigation). Navigating to `/about`, `/contact`, `/faq`, or
  `/terms` (all rendered via the shared `InfoPageComponent`) shows the page shell (header, footer)
  but the `<h1>` title and the entire content body are blank — not missing data, not an error, just
  never painted. Separately, `/shop` (`MenuPageComponent`) shows the hero banner and category
  filter but zero product cards, no loading skeleton, and no "no results" message — the entire
  `@if/@else if/@else` block silently never renders any of its three branches.
- **Investigation:** Confirmed via `git log` that `info-page.component.ts` (and its
  About/Contact/FAQ/Terms callers) have been untouched since the initial commit — this is not a
  regression from today's redesign work. Confirmed via direct component inspection
  (`ng.getComponent()`) that the affected components' `@Input()` properties (e.g. `title`) *do*
  correctly receive their real values ("Contact Us", etc.) — the data is right, only the DOM never
  gets a first paint. Forcing change detection manually (`ng.applyChanges()` from Angular
  DevTools' bridge) does immediately paint the correct content, proving the template itself is
  fine and the bug is that **the component's first change-detection pass after route navigation
  never runs** — not a template bug, not a data-loading bug. Tried the standard fix (inject
  `ChangeDetectorRef`, call `detectChanges()` in `ngOnInit`) — did not work; a debug `console.log`
  placed inside that same `ngOnInit` never fired at all, meaning the lifecycle hook itself isn't
  running, not just that the forced detection was mistimed. Ruled out environment noise: reproduced
  identically after (a) restarting the frontend dev server fresh (this project has a known history
  of the dev server silently going stale, per DEC-011) and (b) building and serving the actual
  production bundle (`ng build --configuration production`, served via a standalone static
  server) — same blank-render behavior in a completely clean, non-HMR environment, so this is a
  real application bug, not a dev-server/HMR artifact. Both affected component families
  (`InfoPageComponent` and `MenuPageComponent`) are lazy-loaded via `loadComponent()`, whereas the
  Home page (which renders correctly) is eagerly loaded — the working theory is this is specific to
  lazy-loaded standalone routes not properly triggering Angular's initial post-navigation change
  detection, but this is not yet confirmed as the root cause.
- **Root cause:** Not fully confirmed. Leading theory: lazy-loaded route activation isn't
  triggering Angular's first change-detection pass reliably in this app's Zone.js configuration.
  Needs more investigation to pin down precisely (possibly a Zone/Router interaction specific to
  Angular 17.3, or something about how `provideRouter`/`provideZoneChangeDetection` are configured
  in `app.config.ts`).
- **Fix:** None applied yet — reverted the attempted `ChangeDetectorRef` fix since it didn't
  actually work, so `info-page.component.ts` is back to its original (broken) state. Flagged to
  Leo for a decision on priority/scope before investing more time.

---

## [BUG] Customer Order Tracking Stepper Not Advancing (ORD-TRACK-089)

- **Opened:** 2026-08-15
- **Status:** fixed (2026-08-15, DEC-010)
- **Symptom:** Ticket ORD-TRACK-089 reported the customer-facing order tracking stepper
  (`Order Received → Preparing → Ready for Pickup → Picked Up`) never advancing after an admin
  updates order status, requiring a hard refresh. Ticket hypothesized missing WebSocket/STOMP
  broadcast (`SimpMessagingTemplate`) and Angular subscription bugs. Reported against a specific
  order, `ORD-193396`.
- **Investigation:**
  - `grep`'d the entire backend and frontend for `WebSocket|STOMP|SimpMessaging` — **zero
    matches** except a comment. There is no WebSocket infrastructure in this codebase at all, so
    the ticket's entire root-cause section (missing `convertAndSend`, unsubscribed STOMP topic,
    DTO enum mismatch) doesn't apply — nothing broke, because nothing like that was ever built.
  - Read `frontend/src/app/features/order-status/order-status-page.component.ts` — it already
    polls `GET /api/v1/orders/{publicToken}` every 6s (`POLL_MS = 6000`) via plain REST, and its
    own comment says this is deliberate: *"In production this would instead subscribe to a
    WebSocket/STOMP push"*. So live-update-without-refresh already works by design; "not
    real-time" was a false lead.
  - Queried `ORD-193396` directly via the H2 console (admin REST API returned `403`, no
    credentials on hand): `STATUS = PREPARING`, `DELIVERY_STATUS = PICKED_UP`,
    `DRIVER_NAME = TestDriver 34567`, `PUBLIC_TOKEN = 057b2e72-387f-473c-b1e3-f6bb57a2c0b0`. The
    database itself says `PREPARING` — this is not a stale-poll/cache artifact; a hard refresh
    would show the same value.
  - Read `OrderService.java` — `order.status` (the enum the stepper renders,
    `RECEIVED/PREPARING/READY/COMPLETED`) is only ever mutated by an explicit admin
    status-update call (`order.setStatus(status)` off the Live Orders board). Nothing in the
    Lalamove webhook/sync path (`applyDeliveryWebhookUpdate`, `syncDeliveryStatus`) touches
    `order.status` — it only writes `deliveryStatus`. Confirmed via
    `order-status-stepper.component.ts`: the stepper's `currentIndex` is computed purely from
    `status: OrderStatus`, with no awareness of `deliveryStatus` at all.
- **Root cause:** `order.status` (customer stepper) and `deliveryStatus` (Lalamove rider
  lifecycle) are two independent fields with no auto-sync between them. For `ORD-193396`, the
  rider already picked up the order (`deliveryStatus = PICKED_UP`) but no admin has clicked
  "Mark Ready" yet, so `order.status` is still sitting at `PREPARING` — genuinely, not due to any
  push/polling defect. (Open Issue 7's gate on "Mark Ready" is already satisfied for this order —
  driver is assigned — so it's clickable right now.)
- **Secondary gap noted, not yet actioned:** even once `order.status` is advanced, the stepper's
  `Ready for Pickup` / `Picked Up` labels are counter-pickup wording and don't reflect Lalamove's
  own delivery lifecycle (`ASSIGNING_DRIVER → ON_GOING → PICKED_UP → COMPLETED`) — a delivery
  customer never sees "rider picked it up" / "on the way" distinctly from a counter-pickup
  customer's steps. Not part of this ticket's scope; worth its own ticket if wanted.
- **Fix:** `ORD-193396` was manually advanced the same session it was reported (`PREPARING` →
  `READY`) so the customer saw progress immediately. Then, separately, Leo brought an SSE-based
  push architecture proposal for live order updates generally; reviewed it (see DEC-009 — declined
  in favor of a cheaper RxJS polling upgrade, since SSE alone wouldn't have fixed this bug anyway).
  Finally implemented the real fix: `syncOrderStatusFromDelivery(Order)` in `OrderService.java`,
  called from `applyDeliveryWebhookUpdate()` (the shared choke point for both the real webhook and
  the manual sync button), auto-advances `order.status` to `READY` the moment a driver is assigned
  or `deliveryStatus` reaches `ON_GOING`/`PICKED_UP` (same condition `canMarkReady()` already
  gated the manual button on), and to `COMPLETED` the moment `deliveryStatus` reaches `COMPLETED`.
  Delivery orders only; pickup orders and already-terminal orders are untouched. See DEC-010 for
  the full design rationale and live verification (restarted the backend, used
  `simulate-lalamove-webhook.js` to send a real signed `DRIVER_ASSIGNED` event against a real
  `PREPARING` order, confirmed `order.status` flipped to `READY`; then simulated
  `ON_GOING → PICKED_UP → COMPLETED`, confirmed `order.status` followed to `COMPLETED`). The
  stepper's delivery-unaware labels (Open Issue 11 follow-up) remain a separate, deferred item.

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