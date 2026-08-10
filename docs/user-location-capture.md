# Getting the Customer's Exact Location

How the checkout delivery step figures out where to send a rider, for addresses that don't have
a house number Google can look up directly (block/lot subdivisions like Sarmiento Homes, SJDM).

## Why this needed more than a text field

Plain forward geocoding (turn typed text into a coordinate) breaks in three specific ways for
Philippine subdivision addressing:

1. **No house number to anchor to.** "Block 33 Lot 09, Sampaguita Street" has nothing a geocoder
   can confidently pin — it can only guess the general area.
2. **Ambiguous landmark names.** A search like `"tokyo liqour house , muzon"` can match a real
   place in the *wrong* Muzon — there's a Muzon in San Jose del Monte, Bulacan, and a completely
   different one in Malabon, Metro Manila, ~15km apart. This is a real incident that happened
   during testing (see below) — Lalamove rejected the resolved point as
   `ERR_OUT_OF_SERVICE_AREA` because it silently picked the wrong one.
3. **The rider needs different information than the router does.** A backend wants a coordinate
   for distance/fee math; a motorcycle rider wants a gate color and a landmark. One field can't
   serve both well.

## The three-piece flow

```
Search text  →  Geocode (+ disambiguate)  →  Drag pin to confirm  →  Free-text rider notes
 "landmark,       Google Geocoding API         Leaflet + OpenStreetMap    "Blk 18 Lot 16,
  barangay"       (server-side, free tier)      (no key, no billing)       North Gate"
```

Each piece is a separate concern, and each is stored separately — the coordinate is never
derived from the text, and the text is never geocoded.

### 1. Search → geocode, with disambiguation

`POST /api/v1/delivery/quote { address }` calls `GeocodingService.geocodeCandidates()`
(`backend/src/main/java/com/bakery/delivery/GeocodingService.java`), which returns up to 3
results from a single Google Geocoding call — same cost as before, just reading more of the
response.

`DeliveryQuoteService.keepGenuinelyDistinct()` then filters those down: candidates within
**1.5km** of the top result are treated as the same place (ordinary geocoding jitter) and
collapsed to just the top one. Only candidates *farther* than that are surfaced to the customer
as a "which one did you mean?" picker — this is what catches the two-different-Muzons case
without pestering the customer for the common, unambiguous search.

**Two real quirks found while debugging this, both fixed in `GeocodingService`:**

- **Comma spacing measurably changes Google's result.** `"tokyo liqour house, muzon"` (no space
  before the comma — exactly what a customer typed) resolved to the geographic *center of the
  entire Philippines* — Google's fallback when it can't tokenize a query into anything it
  recognizes. The same text with a space before the comma (`"tokyo liqour house , muzon"`)
  resolved correctly to two real, disambiguable places. `geocodeLookupPath()` now normalizes
  comma spacing (`\s*,\s*` → `", "`) before every lookup, for free.
- **A whole-country match is not a real address.** Independent of the spacing issue, *any*
  sufficiently vague search can make Google fall back to a country-level centroid rather than a
  real place — before this fix, that fake-but-real-looking coordinate would silently reach
  Lalamove, which rejects it as `ERR_OUT_OF_SERVICE_AREA` (a confusing message for something
  that was never really a location in the first place). `excludeCountryLevelMatches()` now
  filters out any result whose Google `types` include `"country"`, treating it the same as
  zero results — a clear "couldn't find that address" instead of a mysterious service-area error.

If there's exactly one genuinely distinct result, the flow proceeds straight to a Lalamove quote,
identical to before this fix existed.

### 2. Drag the pin to confirm

Once a quote resolves (whether directly, or after picking a candidate), the checkout page shows
an interactive map (`DeliveryMapComponent`,
`frontend/src/app/features/checkout/delivery-map/delivery-map.component.ts`) centered on that
point, with a draggable pin.

**This map has no API key and no billing account at all** — it's Leaflet.js rendering
OpenStreetMap tiles, both free and keyless. This was a deliberate choice over the Google Maps
JavaScript SDK specifically to avoid two problems a Google-based interactive map would have
introduced:

- Shipping the Google Maps key to the browser (a real exposure risk — a scraped key can be used
  by anyone, turning into unexpected billing).
- Google Places Autocomplete has **no free tier at all** — it bills from the very first request,
  unlike Geocoding's 10,000/month free tier. It was evaluated and explicitly rejected for this
  project for that reason.

Dragging the pin doesn't immediately re-quote — that would spam Lalamove's API on every pixel of
drag. Instead, a "Confirm new location" button only appears once the pin has actually moved, and
only *that* click re-requests the fee quote, this time passing the exact dropped coordinates
straight through (`DeliveryQuoteRequestDto.latitude`/`longitude`), skipping forward-geocoding
entirely.

If the customer never drags — the common case, once the search resolved to the right place —
this whole map is just a visual confirmation and nothing extra happens.

### 3. Confirming labels the point

When a pin is confirmed without an already-known label (i.e. it was dragged to a genuinely new
spot, not picked from the candidate list), `DeliveryQuoteService.requestQuote()` calls
`GeocodingService.reverseGeocode()` once to get a clean display address for that exact point —
the same Geocoding API, same free tier, just run in the other direction.

### 4. Structured rider notes — separate, never geocoded

The "House/Unit No., Block & Lot, Gate Details" field (`deliveryUnitDetails` on `Order`) is plain
text, carried through untouched to the rider. It's never sent to any geocoding call — Philippine
subdivision block/lot addressing frequently isn't in Google's index at house-level precision, so
trying to force sub-lot geocoding accuracy is often simply impossible. A few hundred meters of
imprecision on the *fee-calculating* coordinate doesn't matter; the rider finding the actual door
is what this field is for.

## What's stored

| Field | Source | Purpose |
|---|---|---|
| `deliveryAddress` | Geocode/reverse-geocode result | Fee calculation, routing |
| `deliveryLatitude` / `deliveryLongitude` | Same | Fee calculation, routing |
| `deliveryUnitDetails` | Customer-typed, free text | Rider instructions only |
| `notes` | Customer-typed, free text | Kitchen prep notes (different audience entirely) |

**Coordinate columns need explicit precision.** Every `BigDecimal` latitude/longitude column
(`StoreSettings`, `DeliveryQuote`, `Order`) carries `@Column(precision = 11, scale = 8)`. Without
it, Hibernate defaults an unannotated `BigDecimal` column to scale 2 — silently rounding every
coordinate to ~1km precision on write. This was a real, found-in-production-testing bug: the
store's own pinpoint kept reading back as `14.87, 121.04` (truncated from `14.8690823,
121.0430113`) on every subsequent read, even though the geocoded value going *in* was precise —
enough drift that reverse-geocoding it landed on a different, unrelated shop next door instead
of the café. Same-request responses (e.g. a delivery quote's own JSON) never showed the bug,
since they serialize the in-memory value before Hibernate ever round-trips it through the
column — only a *later* read of a *persisted* row exposed it. Any new coordinate column added
later needs the same annotation, or it will silently reintroduce this.

**A Maps "place" URL's own name beats reverse-geocoding its coordinates.** Pasting
`.../maps/place/Home+Cafe+by+Bami/@14.86...` and reverse-geocoding just the embedded pin
coordinates can resolve to a *different* business if two POIs sit close together (confirmed:
the café's own pin reverse-geocoded to an unrelated neighboring shop). Since the place's name is
already right there in the URL path, `GeocodingService` now extracts and uses it directly
instead of reverse-geocoding — cheaper, and immune to this whole class of mislabeling. Reverse-
geocoding is still the fallback for a bare pin-drop URL that has no place name of its own.

## Cost summary

The only paid API in this entire flow is Google Geocoding, used twice per checkout at most
(once forward, once in reverse if the pin was adjusted) — both well inside the free 10,000/month
tier for a business this size. Leaflet, OpenStreetMap tiles, and the drag interaction itself have
no key, no billing account, and no way to run up unexpected cost even under abuse.
