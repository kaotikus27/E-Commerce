# Session Handoff Summary — Home by Bami E-Commerce Project (continued, part 4, on macOS)

This picks up from the prior Windows-session handoff (`14b95be`, "part 3"). Everything below happened THIS session, on the **Mac** (`/Users/ehalaman/Documents/AI-PRACTICE/coffeeshop-ecommerce/E-Commerce/`), not Windows. One real code fix was committed and pushed (`4692a83`); everything else was environment setup and live runtime configuration (not code).

## Git state — read before doing anything else

```
Pushed to origin/main:
14b95be  Add Lalamove webhook signature verification, delivery address disambiguation, and draggable pin map   <-- prior session
4692a83  Fix mvnw missing executable bit   <-- THIS session, pushed
```

Repo: `https://github.com/kaotikus27/E-Commerce.git`. Working tree clean, pushed.

## Critical fact: this is the Mac, a different machine from prior sessions

Prior sessions ran on `C:\Users\Public.DESKTOP-3A1LBHM\...\E-Commerce\`. This session is on `/Users/ehalaman/Documents/AI-PRACTICE/coffeeshop-ecommerce/E-Commerce/` — a separate clone that needed catching up (`git pull` from `0523605` to `14b95be` at the start of this session) and its own from-scratch environment setup, since none of the machine-local config (env vars, JVM trust store, `.claude/launch.json`) carries over between machines.

## Part 1 — Mac environment setup (all real, one-time friction, now resolved)

1. **`backend/mvnw` wasn't executable** in the repo — `chmod +x` fixed it, committed as `4692a83` (0-byte diff, just the file mode). This means a fresh clone on any machine would previously fail with "Permission denied" running `./mvnw`.
2. **This Mac sits behind a corporate TLS-inspecting proxy (Zscaler)** — macOS/curl trusts its root CA (via an MDM profile), but the JVM's own cacerts trust store does not, so every Maven Central download failed with `PKIX path building failed`. Fixed **without touching system config**: built a separate local trust-store file (`~/.local/java-truststores/cacerts-with-zscaler.jks`, JDK 17 default cacerts + the Zscaler root cert layered in) and pass it via `MAVEN_OPTS` on each Maven invocation. This file should persist across sessions since it's in the home directory, not a temp dir.
3. **Frontend `node_modules` was stale** relative to `package.json` (missing `leaflet`/`@types/leaflet` added in `14b95be`) — fixed with `npm install`.
4. **`.claude/launch.json`** was created/updated at the **top level** (`/Users/ehalaman/Documents/AI-PRACTICE/.claude/launch.json`, NOT inside the E-Commerce repo — that's the wrong location, learned the hard way) with two new entries alongside the pre-existing unrelated `globe-um-frontend` entry:
   - `bami-backend`: `sh -c "cd .../backend && ./mvnw spring-boot:run"` — **this entry doesn't actually work** (sandbox `cd` permission errors in the preview tool); backend was ultimately always started via a plain `Bash` background task instead, not via `preview_start`.
   - `bami-frontend`: `npm --prefix .../frontend run start` on port 4200 — this one works fine via `preview_start`.

## Part 2 — Backend/frontend startup commands (the ones that actually work on this Mac)

**Backend**, run from `backend/`:
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home \
MAVEN_OPTS="-Djavax.net.ssl.trustStore=$HOME/.local/java-truststores/cacerts-with-zscaler.jks -Djavax.net.ssl.trustStorePassword=changeit" \
/opt/homebrew/bin/mvn spring-boot:run
```
(Uses Oracle JDK 17 at that path — homebrew's own OpenJDK 24 also hit the same Zscaler cert issue and was avoided. Homebrew `mvn` is used directly rather than the `./mvnw` wrapper, since the wrapper tries to self-download its own Maven distribution and hits the same cert problem before ever reaching the trust-store fix.)

**Frontend**, run from `frontend/`:
```bash
npm start
```

**Critical gotcha discovered repeatedly this session**: environment variables exported via `export ... >> ~/.zshrc` only take effect in **brand-new shell instances** opened *after* the export/source — not in a terminal tab that was already open, even after `source ~/.zshrc` is run in a *different* tab, and NOT in a shell that already has an old value loaded even if you edit the file afterward. Every "still missing env var" loop this session traced back to reusing an old terminal/shell process instead of opening a genuinely new one. If picking this back up, the cleanest move is to fully quit and reopen the terminal app, `echo` the var first to confirm before running anything.

## Part 3 — Credentials now configured on this Mac (as of this session)

- `GOOGLE_MAPS_API_KEY` — set in `~/.zshrc`, confirmed working (real Geocoding API calls succeed).
- `LALAMOVE_API_KEY` / `LALAMOVE_API_SECRET` — set in `~/.zshrc`, confirmed working via a **direct curl test against Lalamove's sandbox API** (bypassing the app entirely) — got a real HMAC-authenticated 201 response with a price breakdown. **Real bug found and fixed along the way**: `~/.zshrc` had ended up with two conflicting `LALAMOVE_API_SECRET` lines, one with a missing closing quote (`export LALAMOVE_API_SECRET="sk_test_...` with no trailing `"`) — an unterminated quote in a shell script can swallow following lines into that variable, which is why the effective secret length kept coming out inconsistent (76, then 72, then 73) across checks. Fixed by deleting the broken duplicate line, keeping only the first complete one (72 chars).
- Neither of these is committed anywhere — they only exist in this Mac's `~/.zshrc`. If a fresh terminal ever shows Lalamove 401s again, that file is the first thing to check for duplicate/malformed export lines.

## Part 4 — Real bug found and fixed: store address was pointing to Vietnam

**Bug**: every delivery quote failed with `ERR_OUT_OF_SERVICE_AREA`, even for extremely central, well-covered Metro Manila addresses (e.g. SM North EDSA) — which was the tell that this wasn't the known Lalamove-sandbox-geofencing quirk documented in the prior session's Part 5, since that quirk is narrow/local to specific spots, not global.

**Root cause**: the Admin → Store Settings → Store Pinpoint field had been set to a Google Maps place URL for a business literally named "BAMI HOME" — but a *different*, unrelated business that happens to share that name, located in **Ho Chi Minh City, Vietnam** (10.84°N, 106.65°E). This is the exact "paste a Google Maps link" feature built in the prior session's Part 7 — it worked exactly as designed, it's just that the URL pasted into it pointed to the wrong place. Since the store's own address is the *origin* point for every Lalamove quote, every quote failed regardless of destination.

**Fix applied**: called `PUT /api/v1/admin/store-settings` directly (via curl with a fresh admin JWT) to reset `storeAddress` back to a real Bulacan address. Note: the backend **re-geocodes whatever address string you save** rather than storing it verbatim, and Google's geocoder simplified `"048 Kay Piskal Rd, Tigbe, Norzagaray, 3013 Bulacan, Philippines"` down to just `"Tigbe, Norzagaray, Bulacan, Philippines"` (municipality-level, not street-level) — functionally fine for unblocking delivery quotes (confirmed via a real successful quote afterward), but **less precise than the exact coordinates from the original fix** (`14.8690823, 121.0430113`, hardcoded in `StoreSettingsSeeder.java:42-43`). Worth re-entering the *exact* street address (or re-pasting the *correct* Google Maps place link for the real Norzagaray store) next time someone's in Admin → Store Settings, to restore full precision.

**End-to-end confirmation (via direct curl, bypassing the browser)**:
```
POST /api/v1/delivery/quote {"address":"SM North EDSA, Quezon City","serviceType":"MOTORCYCLE"}
→ real quotationId, feeTotal: 192, resolvedAddress, googleMapsRouteUrl — all correct.
```
This proves geocoding, address disambiguation, and Lalamove quotation are all fully working on this Mac as of the end of this session.

## Part 5 — H2 in-memory DB: every backend restart wipes runtime settings (recurring friction, unresolved)

Same issue flagged in the prior handoff, hit repeatedly again this session: **every backend restart resets Store Settings to seed defaults** (store hours, store address override, GCash info, store phone all revert). Seed defaults (`StoreSettingsSeeder.java`) do NOT include a `Monday` schedule (seeded as `closedAllDay: true`) and do NOT include phone/GCash info — but DO correctly seed the precise store address/coordinates. Practical implications for whoever picks this up:
- If the store shows "closed" unexpectedly, check today's day-of-week against the seeded schedule first — Monday is closed by seed default; this bit us twice this session.
- Store phone and GCash account info are still empty on this fresh instance — need re-entering in Admin → Store Settings if that's the next task.
- Seriously worth doing this time: switch `application.yml`'s `jdbc:h2:mem:bakerydb` to `jdbc:h2:file:./data/bakerydb`, or a real DB. This has now caused friction across at least two sessions on two different machines.

## Part 6 — A real, reproducible frontend bug found (not yet fixed): admin Store Settings page silently fails to render after certain navigation paths

Late in this session, navigating to `/admin/settings` (both via a fresh full-page URL load AND via clicking the in-app nav link after a fresh re-login) resulted in the page staying on the correct URL, with the admin nav shell visible, but the actual settings form never rendering — no error in the console, and the underlying `GET /api/v1/admin/store-settings` API call never even fired (confirmed via network log), meaning the routed child component never activated. Worked around by hitting the backend API directly with curl instead of via the UI. **Not root-caused** — worth a fresh look if this recurs. Might be related to Part 7's rendering-staleness issue below, or might be a genuine router/guard bug independent of it.

## Part 7 — Browser-automation tooling hit a hard, unresolved wall (same root issue as the prior session's Part 8 note, but worse)

The prior Windows-session handoff already flagged that the automated browser tooling doesn't reliably composite/render frames unless visibly on-screen. This session hit a **more severe version**: after several hours of continuous use, the automated browser tab started serving genuinely stale rendered DOM content (old store address, "closed" banner) **even though the underlying network responses it received were fresh and correct** (verified by reading the actual response body of the exact request the stale page had just made — data was right, rendering wasn't). Things tried that did NOT fix it:
- A hard `navigate()` reload with `force: true`
- Opening a brand-new tab from scratch and navigating there for the first time
- Calling `window.location.reload()` directly via JS

The new tab's `performance.now()` even reported ~131 seconds of elapsed time immediately after "creation," suggesting the preview infrastructure may be reusing/pooling an underlying render target rather than giving a genuinely fresh page per new tab — this is a tooling-level oddity worth being aware of, not something fixable from within a session.

**Net effect**: the backend is fully proven working via direct API calls, but the actual visual/interactive verification (does the checkout UI show the Leaflet map, does dragging the pin work, does "Confirm new location" re-quote correctly) could **not** be completed via automated browser tooling this session.

## Immediate next steps

1. **Manually test the actual checkout + Leaflet map flow in a real, non-automated browser** — open `http://localhost:4200` yourself, add an item, checkout → Delivery → search an address (e.g. "SM North EDSA, Quezon City") → confirm a quote and map render → drag the pin → confirm "Confirm new location" re-quotes correctly. This is the single most important unfinished task carried over from the prior session, and the backend is now confirmed ready for it — this should just work.
2. **Re-enter the precise store address** in Admin → Store Settings (currently at municipality-level precision, not street-level — see Part 4) — and re-enter store phone + GCash info (wiped by the H2 restarts).
3. **Investigate the Admin Store Settings page render bug** (Part 6) if it recurs — not yet root-caused.
4. **Seriously consider switching H2 to file-based persistence** (Part 5) — this is now a two-session, two-machine recurring pain point.
5. Everything else carried over from the prior handoff (satellite-view toggle, Build Rail roadmap artifact update, backlog items) is still open and untouched this session.

## Backlog (carried from original handoff, still open, untouched this session)

No priced customization modifiers; no dedicated refund UI for `PaymentStatus.REFUNDED`; no phone number field on the customer tracking page; category restructure (4→3) still undecided; wallet-balance visibility in admin (webhook received but not persisted anywhere visible); Lalamove cancel-and-clone order replacement (`ORDER_REPLACED` event) not handled. Also newly noted this session: `app.ocr.tessdata-path` in `application.yml` is hardcoded to a Windows path (`C:/Users/Public.DESKTOP-3A1LBHM/...`) — will break GCash receipt OCR on this Mac if that feature gets exercised; not yet fixed.
