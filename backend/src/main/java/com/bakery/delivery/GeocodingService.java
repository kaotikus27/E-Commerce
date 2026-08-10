package com.bakery.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Server-side address-to-coordinates lookup via Google's Geocoding REST API. Kept server-side
 *  (never shipped to the browser) since checkout only needs a typed-address lookup, not an
 *  interactive map — there's no reason for the browser to ever see this key. */
@Service
public class GeocodingService {

    // Matches the exact place-pin coordinates Google embeds in a full (non-shortened) Maps URL,
    // e.g. ".../data=!4m6!3m5!...!3d14.8690823!4d121.0430113!...". More precise than the
    // "@lat,lng,zoom" in the URL path, which is just wherever the map view happened to be panned.
    private static final Pattern MAPS_URL_PIN_PATTERN = Pattern.compile("!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)");
    private static final Pattern MAPS_URL_VIEWPORT_PATTERN = Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+),");
    // A "place" Maps URL (as opposed to a bare pin-drop) embeds the place's own name right in the
    // path, e.g. ".../maps/place/Home+Cafe+by+Bami/@14.86...". Reverse-geocoding the bare
    // coordinates instead of using this name is unreliable — it finds whatever Google considers
    // closest to that exact point, which can be a different business entirely if two POIs sit
    // near the same spot (this happened: reverse-geocoding the café's own pin returned a
    // different, unrelated shop next door instead of the café).
    private static final Pattern MAPS_URL_PLACE_NAME_PATTERN = Pattern.compile("/maps/place/([^/@]+)");

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public GeocodingService(RestClient.Builder restClientBuilder,
                             @Value("${google.maps-api-key}") String apiKey,
                             ObjectMapper objectMapper) {
        this.restClient = restClientBuilder.baseUrl("https://maps.googleapis.com/maps/api/geocode").build();
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
    }

    /** Accepts either a plain typed address or a pasted Google Maps URL — if it's a Maps URL, the
     *  exact embedded pin coordinates are used directly (cheaper and more precise than a text
     *  search); the display label comes from the place name embedded in the URL itself when
     *  present (a "place" URL), falling back to a reverse-geocode only for a bare pin-drop URL
     *  that has no name of its own. A plain typed address falls back to a normal forward geocode. */
    public GeocodeResult resolveAddressOrMapsUrl(String input) {
        BigDecimal[] pinCoordinates = extractCoordinatesFromMapsUrl(input);
        if (pinCoordinates != null) {
            return resolvePinLabel(input, pinCoordinates);
        }
        return geocode(input);
    }

    /** Same acceptance rules as {@link #resolveAddressOrMapsUrl}, but for a plain typed address
     *  returns every plausible candidate instead of just the top one — a pasted Maps URL always
     *  resolves to exactly one exact pin, so it's never ambiguous and always comes back as a
     *  single-element list. */
    public List<GeocodeResult> resolveCandidates(String input) {
        BigDecimal[] pinCoordinates = extractCoordinatesFromMapsUrl(input);
        if (pinCoordinates != null) {
            return List.of(resolvePinLabel(input, pinCoordinates));
        }
        return geocodeCandidates(input);
    }

    private GeocodeResult resolvePinLabel(String mapsUrl, BigDecimal[] pinCoordinates) {
        String placeName = extractPlaceNameFromMapsUrl(mapsUrl);
        return placeName != null
                ? new GeocodeResult(placeName, pinCoordinates[0], pinCoordinates[1])
                : reverseGeocode(pinCoordinates[0], pinCoordinates[1]);
    }

    private String extractPlaceNameFromMapsUrl(String input) {
        Matcher nameMatcher = MAPS_URL_PLACE_NAME_PATTERN.matcher(input.trim());
        if (!nameMatcher.find()) return null;
        return URLDecoder.decode(nameMatcher.group(1), StandardCharsets.UTF_8);
    }

    private BigDecimal[] extractCoordinatesFromMapsUrl(String input) {
        String trimmed = input.trim();
        if (!trimmed.contains("google.com/maps") && !trimmed.contains("goo.gl/maps")) {
            return null;
        }

        Matcher pinMatcher = MAPS_URL_PIN_PATTERN.matcher(trimmed);
        if (pinMatcher.find()) {
            return new BigDecimal[]{new BigDecimal(pinMatcher.group(1)), new BigDecimal(pinMatcher.group(2))};
        }

        Matcher viewportMatcher = MAPS_URL_VIEWPORT_PATTERN.matcher(trimmed);
        if (viewportMatcher.find()) {
            return new BigDecimal[]{new BigDecimal(viewportMatcher.group(1)), new BigDecimal(viewportMatcher.group(2))};
        }

        return null;
    }

    public GeocodeResult geocode(String address) {
        JsonNode firstResult = fetchResults(geocodeLookupPath(address)).get(0);
        return toGeocodeResult(firstResult, address);
    }

    /** Same lookup as {@link #geocode}, but returns every candidate Google found instead of just
     *  the first — used to detect genuinely ambiguous searches (e.g. a landmark name that exists
     *  in more than one barangay/city) so the customer can pick the right one, rather than
     *  silently trusting whichever result happened to rank first. Same single API call either
     *  way, so this costs nothing extra. */
    public List<GeocodeResult> geocodeCandidates(String address) {
        JsonNode results = fetchResults(geocodeLookupPath(address));
        List<GeocodeResult> candidates = new ArrayList<>();
        for (JsonNode result : results) {
            candidates.add(toGeocodeResult(result, address));
            if (candidates.size() == 3) break; // top 3 is plenty to disambiguate; deeper matches are rarely relevant
        }
        return candidates;
    }

    private String geocodeLookupPath(String address) {
        requireConfigured();

        // Google's address parser is measurably sensitive to spacing around commas for
        // compound business-name + area-name queries — "landmark, area" and "landmark , area"
        // can tokenize differently enough to change the result entirely (confirmed: "tokyo
        // liqour house, muzon" degraded to the whole-country centroid, while the same text with
        // ", " normalized resolved correctly). Normalizing to a single consistent "word, word"
        // form removes that variance for free.
        String normalized = address.trim().replaceAll("\\s*,\\s*", ", ");

        // This app only ever serves Philippine addresses — append the country if the customer
        // didn't type it, so short/ambiguous inputs (just a street + barangay) still resolve
        // correctly instead of matching a same-named street elsewhere in the world.
        String addressForLookup = normalized.toLowerCase().endsWith("philippines")
                ? normalized : normalized + ", Philippines";
        String encodedAddress = URLEncoder.encode(addressForLookup, StandardCharsets.UTF_8);

        // components=country:PH is a hard filter (excludes non-PH results entirely); region=ph is
        // just a ranking bias. Using both is stronger than either alone.
        return "/json?address=" + encodedAddress + "&region=ph&components=country:PH&key=" + apiKey;
    }

    private GeocodeResult toGeocodeResult(JsonNode result, String fallbackAddress) {
        JsonNode location = result.path("geometry").path("location");
        return new GeocodeResult(
                result.path("formatted_address").asText(fallbackAddress),
                new BigDecimal(location.path("lat").asText("0")),
                new BigDecimal(location.path("lng").asText("0"))
        );
    }

    public GeocodeResult reverseGeocode(BigDecimal lat, BigDecimal lng) {
        requireConfigured();

        String path = "/json?latlng=" + lat.toPlainString() + "," + lng.toPlainString() + "&key=" + apiKey;
        JsonNode firstResult = fetchResults(path).get(0);

        return new GeocodeResult(
                firstResult.path("formatted_address").asText(lat.toPlainString() + ", " + lng.toPlainString()),
                lat, lng
        );
    }

    private void requireConfigured() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Address lookup isn't configured yet — a Google Geocoding API key is missing.");
        }
    }

    private JsonNode fetchResults(String path) {
        String raw;
        try {
            raw = restClient.get().uri(path).retrieve().body(String.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach the address lookup service.", e);
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not read the address lookup response.", e);
        }

        String status = root.path("status").asText("");
        JsonNode results = root.path("results");

        if ("ZERO_RESULTS".equals(status) || ("OK".equals(status) && results.isArray() && results.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Couldn't find that address — please check it and try again.");
        }
        if (!"OK".equals(status)) {
            // Surface Google's actual status/error_message (e.g. REQUEST_DENIED, OVER_QUERY_LIMIT,
            // INVALID_REQUEST) instead of a misleading generic "not found" — these usually mean a
            // key/billing/API-enablement problem, not a bad address.
            String errorMessage = root.path("error_message").asText("");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Address lookup failed (" + status + (errorMessage.isBlank() ? "" : ": " + errorMessage) + ").");
        }

        JsonNode usefulResults = excludeCountryLevelMatches(results);
        if (usefulResults.isEmpty()) {
            // Google returned only a whole-country match (e.g. the search text didn't tokenize
            // into anything it recognized as a place) — that's not a usable location, so this is
            // functionally the same as ZERO_RESULTS. Without this check, a garbage match like
            // this would otherwise pass a real-looking (but meaningless) coordinate — the
            // country's own centroid — straight through to Lalamove, which then rejects it with
            // a confusing "out of service area" instead of a clear "couldn't find that address".
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Couldn't find that address — please check it and try again.");
        }
        return usefulResults;
    }

    private JsonNode excludeCountryLevelMatches(JsonNode results) {
        var filtered = objectMapper.createArrayNode();
        for (JsonNode result : results) {
            boolean isCountryLevel = false;
            for (JsonNode type : result.path("types")) {
                if ("country".equals(type.asText())) {
                    isCountryLevel = true;
                    break;
                }
            }
            if (!isCountryLevel) filtered.add(result);
        }
        return filtered;
    }
}
