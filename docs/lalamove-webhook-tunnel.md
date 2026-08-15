---
title: "Lalamove Sandbox Webhook — Cloudflare Quick Tunnel Setup"
type: how-to
status: active
created: 2026-08-15
updated: 2026-08-15
ai_access: internal
ai_generated: true
review_status: draft
canonical: true
---

# Lalamove Sandbox Webhook — Cloudflare Quick Tunnel Setup

## Why this exists

The backend runs on `localhost:8080` in local dev. Lalamove's sandbox servers live on the public
internet and cannot reach `localhost` directly — so real (non-simulated) webhook events
(`DRIVER_ASSIGNED`, `ORDER_STATUS_CHANGED`, etc.) never arrive at `/api/v1/lalamove/webhook`
unless a public tunnel exposes the local backend and that tunnel's URL is registered in the
Lalamove sandbox dashboard as the webhook endpoint. See `handoff.md` Open Issue 10 / DEC-006 for
the manual-sync fallback that exists precisely because this tunnel setup is easy to let lapse.

This project uses a Cloudflare **quick tunnel** (`cloudflared tunnel --url ...`, no account/config
needed) rather than a named tunnel, for zero setup cost. The tradeoff, and the reason this doc
exists: **a quick tunnel's URL is not stable.**

## The failure mode

Lalamove's sandbox dashboard shows:

> Your Webhook URL is not responsive. Please update.

This happens because a `*.trycloudflare.com` hostname only exists **while that specific
`cloudflared` process is running**. If the process exits — terminal closed, machine slept,
`cloudflared` crashed, machine rebooted — the DNS record for that hostname disappears entirely
(not just "connection refused"; the hostname stops resolving at all). Any previously-registered
webhook URL pointing at it is now dead, and **restarting the tunnel generates a brand-new random
URL** — the old one can never be reused.

## How to diagnose

Run these in order; stop at the first one that explains the symptom.

1. **Is the local backend actually up?**
   ```
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/v1/orders/nonexistent-token
   ```
   Expect `404` (a real app response — proves the backend is answering). A connection error here
   means the backend itself is down; fix that first, the tunnel is not the problem.

2. **Is `cloudflared` running?**
   ```
   tasklist | findstr cloudflared
   ```
   (or check Task Manager). No matching process = the tunnel is definitely dead — go to
   **Resolution** below.

3. **Does the registered URL even resolve?**
   ```
   curl -v -m 10 https://<the-registered-subdomain>.trycloudflare.com/api/v1/lalamove/webhook
   ```
   `curl: (6) Could not resolve host` confirms the quick-tunnel hostname is gone (this is the
   exact symptom that produced this doc on 2026-08-15). A different error (timeout, connection
   refused) points elsewhere — e.g. `cloudflared` running but pointed at the wrong local port.

## Resolution — start a new tunnel and re-register it

1. **Start the tunnel** (runs until the terminal/process is closed — needs to stay running for
   as long as you want real sandbox webhooks to arrive):
   ```
   cloudflared tunnel --url http://localhost:8080
   ```
   `cloudflared` is installed at `C:\Program Files (x86)\cloudflared\cloudflared.exe` on this
   machine. If running it in the background and capturing output to a log file, grep the log for
   `trycloudflare.com` — the URL appears a few seconds after startup, e.g.:
   ```
   INF |  https://millennium-infrared-barry-week.trycloudflare.com  |
   ```

2. **Verify it actually routes through**, before touching the Lalamove dashboard:
   ```
   curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<new-subdomain>.trycloudflare.com/api/v1/lalamove/webhook -H "Content-Type: application/json" -d "{}"
   ```
   Expect `200` — `LalamoveWebhookController` returns 200 regardless of signature validity (it
   only logs a bad signature internally), so this confirms the tunnel → local backend path is
   wired correctly, not that a specific event was accepted. To confirm actual event processing,
   use `backend/scripts/simulate-lalamove-webhook.js` directly against `localhost:8080` (it signs
   requests correctly; the public tunnel doesn't need to be involved for that kind of test).

3. **Register the new URL** in the Lalamove sandbox dashboard's webhook settings, replacing
   whatever URL is currently saved there. The path suffix is always `/api/v1/lalamove/webhook`.

4. **Leave the tunnel process running** for the duration of testing. Closing the terminal (or the
   machine sleeping/rebooting) kills it silently — the next symptom will be this same "Your
   Webhook URL is not responsive" message, and the fix is to repeat this whole procedure with the
   new random URL it generates.

## Longer-term option (not yet done)

A **named Cloudflare tunnel** (requires a free Cloudflare account + `cloudflared tunnel create`,
bound to a fixed hostname) would survive restarts with the same URL, removing the need to
re-register with Lalamove every time. Not set up as of 2026-08-15 — tracked in `backlog.md` if
the manual-restart cost becomes annoying enough to justify it.
