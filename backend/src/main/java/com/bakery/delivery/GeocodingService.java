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

/** Server-side address-to-coordinates lookup via Google's Geocoding REST API. Kept server-side
 *  (never shipped to the browser) since checkout only needs a typed-address lookup, not an
 *  interactive map — there's no reason for the browser to ever see this key. */
@Service
public class GeocodingService {

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

    public GeocodeResult geocode(String address) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Address lookup isn't configured yet — a Google Geocoding API key is missing.");
        }

        String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
        // region=ph biases ambiguous street names toward the Philippines instead of another country.
        String path = "/json?address=" + encodedAddress + "&region=ph&key=" + apiKey;

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

        JsonNode results = root.path("results");
        boolean found = "OK".equals(root.path("status").asText("")) && results.isArray() && !results.isEmpty();
        if (!found) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Couldn't find that address — please check it and try again.");
        }

        JsonNode firstResult = results.get(0);
        JsonNode location = firstResult.path("geometry").path("location");
        return new GeocodeResult(
                firstResult.path("formatted_address").asText(address),
                new BigDecimal(location.path("lat").asText("0")),
                new BigDecimal(location.path("lng").asText("0"))
        );
    }
}
