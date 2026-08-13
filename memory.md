---
title: "Home by Bami E-Commerce — Project Memory"
type: memory
status: active
owner: "Leo"
created: 2026-08-11
updated: 2026-08-11
ai_access: internal
ai_generated: true
review_status: draft
canonical: true
---

# Purpose

Durable, reviewed decisions, constraints, and terminology for the Home by Bami e-commerce project. Distilled from the project's own docs (`delivery-fulfillment.md`, `user-location-capture.md`) and prior session handoffs — not a session transcript.

# Durable Decisions and Constraints

- **Server never trusts a client-sent delivery fee.** `OrderService.placeOrder()` always re-reads the fee from the persisted `DeliveryQuote` row by `quotationId`; expired or already-used quotes are rejected outright (400), not silently accepted.
- **The delivery fee is locked at order time.** A fresher dispatch-time re-quote (when the kitchen marks an order ready) never changes what the customer already paid — the store absorbs any difference.
- **Location capture is three separate concerns, stored separately, never cross-derived**: a geocoded coordinate (fee/routing math), a free-text "rider notes" field (unit/gate/landmark details for the human rider), and kitchen prep notes (a different audience entirely).
- **Leaflet + OpenStreetMap, not the Google Maps JS SDK, for the interactive delivery pin map** — deliberate: avoids shipping a scrapeable Google Maps key to the browser, and Google Places Autocomplete has no free tier at all (bills from request 1), unlike Geocoding's 10,000/month free tier.
- **Every lat/lng column needs an explicit `@Column(precision = 11, scale = 8)`.** Hibernate silently defaults an unannotated `BigDecimal` column to scale 2, rounding persisted coordinates to ~1km precision on read (a real bug found in production testing — same-request JSON responses never showed it, only a later read of a persisted row did). Any new coordinate column needs the same annotation.
- **A Google Maps place-URL's own name beats reverse-geocoding its embedded coordinates** when labeling a pinned location — two nearby POIs can reverse-geocode to the wrong business.
- **Webhook signature verification signs `data` alone** (re-serialized), not the full envelope. The webhook endpoint always returns 200 even on a failed or unrecognized signature — Lalamove disables a webhook URL after enough non-200 responses, and a retry can't fix a payload already rejected as invalid.
- **Comma spacing measurably changes Google Geocoding's result** for ambiguous local addresses; the address-lookup path normalizes comma spacing before every lookup, and filters out any result Google itself tags as country-level (a sign the search was too vague to be a real address).
- **`backend/mvnw` must keep its executable bit set in the repo itself** (fixed, committed `4692a83`) — otherwise a fresh clone fails on macOS/Linux with "Permission denied."
- **Per-machine dev environment setup does not carry over between machines** — env vars, JVM trust store, and editor launch configs need a fresh setup pass on each new machine. A TLS-inspecting corporate proxy (Zscaler) on at least one dev Mac requires a separate local JVM trust store file passed via `MAVEN_OPTS`, rather than modifying the system trust store. Same pattern now applies to `TESSDATA_PATH` (see DEC-005) — set it locally per machine, never commit a machine-specific value.
- **H2 is now file-based (`jdbc:h2:file:./data/bakerydb`), not in-memory** (DEC-003, implemented 2026-08-13) — all data, including Store Settings, survives a backend restart. `backend/data/` is git-ignored (real DB file, not shareable). Verified live by setting `storePhone` and confirming it across a restart.

# Long-Lived Constraints

- Do not let the backend accept a client-supplied delivery fee under any circumstance.
- Do not introduce a new lat/lng column without the explicit precision/scale annotation.
- Do not store secrets, API keys, or credentials in this file or anywhere in KOS — they live only in each machine's local shell config, never committed.
