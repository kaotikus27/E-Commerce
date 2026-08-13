---
title: Project Context
type: project-context
status: active
owner: "Leo"
created: 2026-08-11
updated: 2026-08-11
ai_access: internal
ai_generated: true
review_status: draft
---

# Project Context

## Objective

Deliver a working mobile-first ordering site for Home by Bami (bakery/coffeeshop): catalog browsing, cart, checkout with pickup or Lalamove delivery, order tracking, and a role-gated admin dashboard (live orders, menu/inventory, store settings).

## Users

- Customers ordering for pickup or delivery (guest or logged-in).
- Store admin managing live orders, menu/inventory, and store settings.

## Constraints

- Stack is fixed: Angular 17 (standalone + Signals) frontend, Spring Boot 3 / Java 17 backend.
- H2 file-based DB in dev (`jdbc:h2:file:./data/bakerydb`, switched from in-memory 2026-08-13, see `DECISIONS.md` DEC-003) — runtime settings now survive a backend restart.
- Delivery via Lalamove v3 API; geocoding via Google Geocoding API (free tier, 10,000/month) — Google Places Autocomplete deliberately avoided (no free tier).
- Interactive delivery-pin map uses Leaflet + OpenStreetMap (no API key, no billing) rather than the Google Maps JS SDK.
- Development happens across at least two machines (Windows and Mac); machine-local config (env vars, JVM trust store, editor launch configs) does not carry over and must be re-set up per machine.

## Current Phase

Active development. Core ordering flow, admin dashboard, delivery fulfillment, and location-capture/disambiguation are implemented and backend-verified. Manual, real-browser verification of the checkout delivery map flow (search → quote → drag pin → re-quote) is the next concrete step — see `handoff.md`.

## Authorities

- `memory.md` — durable decisions and constraints.
- `handoff.md` — current execution state and next action.
- `DECISIONS.md` — decision log.
- `backlog.md` — open backlog.
- In-repo: `README.md`, `AGENTS.md`, `docs/delivery-fulfillment.md`, `docs/user-location-capture.md` (how the code actually works — not duplicated here).
