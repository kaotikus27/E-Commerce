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

## Review Notes — 2026-08-13

**Questions / clarifications**

- `updated: 2026-08-11` in the frontmatter predates the DEC-003 reference (2026-08-13) added to Constraints. Should `updated` be bumped whenever a dated cross-reference like this is added, or does it only track structural edits to this file?
- The `Authorities` list doesn't state precedence. If `memory.md` and `DECISIONS.md` ever disagree on a constraint, which one wins — or are they expected to never conflict by construction?
- Objective mentions a "role-gated admin dashboard," but Users only names one admin role ("Store admin managing..."). Is there more than one gated role (e.g., owner vs. staff), or is "role-gated" just singular (admin vs. anonymous customer)?
- Constraints cover dev-only DB config (H2 file-based) and multi-machine dev setup, but there's no mention of the production DB/hosting target. Is that intentionally out of scope for this doc, or still undecided?
- `review_status: draft` — is this file still awaiting a first review pass, or should this be flipped to `reviewed` now that the project is in active development and this doc is being cited by `handoff.md`?

**Simplification opportunities**

- Constraints currently mixes four different concerns in one flat list (fixed stack, dev DB config, third-party delivery/geocoding/mapping services, multi-machine dev setup). Splitting into short sub-groups (e.g. "Stack", "Third-party services", "Dev environment") would make it faster to scan without adding length.
- The H2/DEC-003 detail in Constraints restates specifics that already live in `DECISIONS.md`. Since `DECISIONS.md` is already listed as the authority for decisions, this line could shrink to just the constraint ("dev DB must survive backend restarts — see DEC-003") and drop the connection-string/migration detail, so it doesn't need editing twice when the decision evolves further.
- Current Phase duplicates state that `handoff.md` is the declared authority for ("current execution state and next action"). Consider trimming this to one sentence pointing at `handoff.md`, rather than restating the next concrete step here — reduces the risk of the two files drifting out of sync.
