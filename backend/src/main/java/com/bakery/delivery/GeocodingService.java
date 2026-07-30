package com.bakery.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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
     *  search) and reverse-geocoded just to get a clean display address; otherwise falls back to
     *  a normal forward geocode of the text. */
    public GeocodeResult resolveAddressOrMapsUrl(String input) {
        BigDecimal[] pinCoordinates = extractCoordinatesFromMapsUrl(input);
        if (pinCoordinates != null) {
            return reverseGeocode(pinCoordinates[0], pinCoordinates[1]);
        }
        return geocode(input);
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
        requireConfigured();

        // This app only ever serves Philippine addresses — append the country if the customer
        // didn't type it, so short/ambiguous inputs (just a street + barangay) still resolve
        // correctly instead of matching a same-named street elsewhere in the world.
        String addressForLookup = address.trim().toLowerCase().endsWith("philippines")
                ? address.trim() : address.trim() + ", Philippines";
        String encodedAddress = URLEncoder.encode(addressForLookup, StandardCharsets.UTF_8);

        // components=country:PH is a hard filter (excludes non-PH results entirely); region=ph is
        // just a ranking bias. Using both is stronger than either alone.
        String path = "/json?address=" + encodedAddress + "&region=ph&components=country:PH&key=" + apiKey;
        JsonNode firstResult = fetchFirstResult(path);

        JsonNode location = firstResult.path("geometry").path("location");
        return new GeocodeResult(
                firstResult.path("formatted_address").asText(address),
                new BigDecimal(location.path("lat").asText("0")),
                new BigDecimal(location.path("lng").asText("0"))
        );
    }

    public GeocodeResult reverseGeocode(BigDecimal lat, BigDecimal lng) {
        requireConfigured();

        String path = "/json?latlng=" + lat.toPlainString() + "," + lng.toPlainString() + "&key=" + apiKey;
        JsonNode firstResult = fetchFirstResult(path);

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

    private JsonNode fetchFirstResult(String path) {
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

        return results.get(0);
    }
}
