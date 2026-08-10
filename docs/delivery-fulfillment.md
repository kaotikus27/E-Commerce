# How Delivery Fulfillment Works

End-to-end path for a delivery order, from fee quote at checkout to a rider showing up at the
store — built on Lalamove's v3 API. This is the *fulfillment* side; for how the destination
address/coordinate is captured, see [`user-location-capture.md`](./user-location-capture.md).

## The three phases

```
Phase 1: Quote          Phase 2: Order            Phase 3: Dispatch
(checkout, no cost)      (order placed)             (kitchen ready)
      │                       │                          │
      ▼                       ▼                          ▼
POST /v3/quotations   Order.fulfillmentType       PATCH .../dispatch
  → DeliveryQuote       = DELIVERY, deliveryFee     → re-quotes fresh,
    (server-cached,       locked from the quote       then POST /v3/orders
     single-use)                                       → real rider assigned
```

### Phase 1 — Quotation (`com.bakery.delivery`)

`DeliveryQuoteService.requestQuote()` geocodes the destination (see the location-capture doc),
calls Lalamove's `POST /v3/quotations`, and persists the result as a `DeliveryQuote` row —
keyed by `quotationId`, with an expiry (Lalamove's quotes are single-use and expire in ~5
minutes).

**This is the integrity boundary that matters most in the whole feature**:
`OrderService.placeOrder()` never trusts a fee the client sends. It looks up the `DeliveryQuote`
by `quotationId` and reads the fee from *that* row — a tampered client-side value can never
reach an actual order. `DeliveryQuoteService.validateAndConsume()` also rejects an
already-used or expired quote outright (400, not a crash).

### Phase 2 — Order placement

When `fulfillmentType == DELIVERY`, `OrderService.placeOrder()`:
1. Consumes the matching `DeliveryQuote` (marks it used, so it can't be replayed onto a second order).
2. Copies its address, coordinates, and fee onto the `Order`.
3. Sets `deliveryStatus = NOT_DISPATCHED` — nothing has been sent to Lalamove yet. Placing an
   order only reserves the fee and address; it does **not** call Lalamove a second time.

### Phase 3 — Dispatch (kitchen marks the order Preparing/Ready)

The admin board shows a "Call Lalamove Rider" button once an order reaches `PREPARING` or
`READY`. Clicking it calls `PATCH /api/v1/admin/orders/{orderNumber}/dispatch` →
`DeliveryDispatchService.dispatch()`, which:

1. **Re-quotes fresh** using the *already-stored* destination coordinates (no re-geocoding —
   cheaper, and the checkout-time quote's 5-minute window is essentially always expired by the
   time kitchen prep finishes anyway, so checking staleness first has no payoff).
2. Calls `LalamoveClient.placeOrder()` → `POST /v3/orders`, which actually assigns a real rider
   in Lalamove's system and returns a `trackingShareLink`.
3. Sets `deliveryStatus = ASSIGNING_DRIVER`.

**Business rule, deliberate**: the customer's *paid* `deliveryFee` (locked in at Phase 2) never
changes even if this fresh dispatch-time quote comes back different — any difference is absorbed
by the store, not passed to the customer after the fact.

## Staying in sync: webhooks

Lalamove pushes status changes to `POST /api/v1/lalamove/webhook`
(`LalamoveWebhookController`) as the rider gets assigned, picks up, and delivers. Confirmed real
event types (from a real captured sandbox sequence, not just the docs):

| Event | What it updates |
|---|---|
| `ORDER_STATUS_CHANGED` | `deliveryStatus`, `trackingShareLink` (nested under `data.order`) |
| `DRIVER_ASSIGNED` | `driverName`, `driverPhone`, `driverPlateNumber` |
| `WALLET_BALANCE_CHANGED` | Not stored — informational only, useful for debugging wallet issues |
| `ORDER_CREATED` | Not stored — Lalamove's own record confirmation, not new information for us |

### Signature verification

Every webhook is signed the same way Lalamove signs its own outbound API calls — confirmed
against Lalamove's official (if hard-to-extract — it's an image-only slide deck) developer
tutorial, and independently re-verified byte-for-byte against a real captured payload:

```
signature = HMAC-SHA256(apiSecret, "<timestamp>\r\nPOST\r\n<webhook path>\r\n\r\n<JSON.stringify(data)>")
```

Implemented in `LalamoveHmacSigner.verifyWebhookSignature()`, called from
`LalamoveWebhookController.isSignatureValid()`. A few things worth knowing if this ever needs
touching again:

- The signed body is `data` **alone**, re-serialized — not the full envelope (`apiKey`,
  `signature`, etc. are excluded from what's signed).
- The webhook always returns `200`, even when the signature fails or the event type is
  unrecognized — Lalamove disables a webhook URL after enough non-200 responses, and a retry
  can't fix a payload we've already rejected as invalid.
- A failed signature doesn't crash anything — the event is just silently dropped (logged, not
  applied), since trusting an unverified payload is worse than missing one update (Lalamove
  retries up to 10 times over 24 hours anyway).

### Delivery status machine

`DeliveryStatus` is a third state machine alongside `OrderStatus` (kitchen prep) and
`PaymentStatus` (money) — deliberately orthogonal, same pattern used throughout this project:

```
NOT_DISPATCHED → ASSIGNING_DRIVER → ON_GOING → PICKED_UP → COMPLETED
                        │                          │
                        ▼                          ▼
                    REJECTED                   CANCELED
```

## Local testing without a public server

Lalamove needs a real HTTPS URL to send webhooks to. For local development, a
[`cloudflared`](https://developers.cloudflare.com/cloudflare-one/) "quick tunnel" exposes
`localhost:8080` at a temporary `https://<random>.trycloudflare.com` URL, registered as the
webhook URL in the Lalamove Partner Portal for the duration of testing:

```bash
cloudflared tunnel --url http://localhost:8080
```

This is explicitly a dev convenience, not a production setup — the URL is random and dies with
the tunnel process. A real deployment needs a stable domain.

## Known gaps / next steps

- **Wallet funding**: dispatch can fail with a real `402 insufficient credit` in sandbox, same as
  it would in production if the wallet runs dry — this isn't something the app can detect ahead
  of time short of calling Lalamove's wallet-balance endpoint before every dispatch, which isn't
  currently wired up. The `WALLET_BALANCE_CHANGED` webhook event is received but not persisted
  anywhere an admin could see it.
- **`ERR_OUT_OF_SERVICE_AREA` near sandbox boundaries**: Lalamove's sandbox coverage area is
  narrower than the market name ("Manila NCR & South Luzon...") implies, and its boundary can cut
  through a real neighborhood at a much finer grain than the production service area would.
  Addresses right at that edge can fail in sandbox and work fine in production — not a code bug,
  just a sandbox-testing quirk to be aware of.
- **Cancel-and-clone orders**: Lalamove can cancel and silently re-create an order under a new
  `orderId` (e.g. for post-match fee adjustments), sending `ORDER_REPLACED` to link the two. This
  isn't handled yet — `applyDeliveryWebhookUpdate()` looks up strictly by the *original*
  `lalamoveOrderId`, so a replaced order's updates would silently stop applying.
