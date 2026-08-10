package com.bakery.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/** Thin, signed wrapper around Lalamove's v3 REST API. Every method fails fast with a clear 503
 *  if credentials aren't configured, rather than attempting a signed call that can only fail. */
@Service
public class LalamoveClient {

    private final RestClient restClient;
    private final LalamoveHmacSigner signer;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String apiSecret;
    private final String market;
    private final String language;

    private volatile JsonNode cachedCities;

    public LalamoveClient(RestClient.Builder restClientBuilder,
                           @Value("${lalamove.base-url}") String baseUrl,
                           @Value("${lalamove.api-key}") String apiKey,
                           @Value("${lalamove.api-secret}") String apiSecret,
                           @Value("${lalamove.market}") String market,
                           @Value("${lalamove.language}") String language,
                           LalamoveHmacSigner signer,
                           ObjectMapper objectMapper) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.market = market;
        this.language = language;
        this.signer = signer;
        this.objectMapper = objectMapper;
    }

    private boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && apiSecret != null && !apiSecret.isBlank();
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Delivery quotes aren't configured yet — Lalamove API credentials are missing.");
        }
    }

    /** GET /v3/cities — cached for the process lifetime; used to look up valid serviceType/specialRequests
     *  instead of hardcoding values that may not exist for this market (e.g. "LALABAG" is HK-only). */
    public JsonNode getCityCapabilities() {
        requireConfigured();
        JsonNode cached = cachedCities;
        if (cached != null) return cached;

        synchronized (this) {
            if (cachedCities == null) {
                cachedCities = parseJson(signedRequest("GET", "/v3/cities", ""));
            }
            return cachedCities;
        }
    }

    public LalamoveQuotation getQuotation(BigDecimal originLat, BigDecimal originLng, String originAddress,
                                          BigDecimal destLat, BigDecimal destLng, String destAddress,
                                          String serviceType) {
        requireConfigured();
        String path = "/v3/quotations";

        ObjectNode body = objectMapper.createObjectNode();
        ObjectNode data = body.putObject("data");
        data.put("serviceType", serviceType);
        data.put("language", language);
        data.putArray("specialRequests");
        var stops = data.putArray("stops");
        stops.add(stopNode(originLat, originLng, originAddress));
        stops.add(stopNode(destLat, destLng, destAddress));

        String bodyJson;
        try {
            bodyJson = objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build Lalamove quotation request", e);
        }

        JsonNode responseData = parseJson(signedRequest("POST", path, bodyJson)).path("data");

        String quotationId = responseData.path("quotationId").asText(null);
        String total = responseData.path("priceBreakdown").path("total").asText(null);
        String expiresAtRaw = responseData.path("expiresAt").asText(null);
        JsonNode responseStops = responseData.path("stops");
        String originStopId = responseStops.path(0).path("stopId").asText(null);
        String destinationStopId = responseStops.path(1).path("stopId").asText(null);

        if (quotationId == null || total == null || originStopId == null || destinationStopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Lalamove did not return a valid quotation.");
        }

        Instant expiresAt = expiresAtRaw != null ? Instant.parse(expiresAtRaw) : Instant.now().plusSeconds(300);
        return new LalamoveQuotation(quotationId, new BigDecimal(total), expiresAt, originStopId, destinationStopId);
    }

    public LalamoveOrder placeOrder(String quotationId, String senderStopId, String senderName, String senderPhone,
                                     String recipientStopId, String recipientName, String recipientPhone, String remarks) {
        requireConfigured();
        String path = "/v3/orders";

        ObjectNode body = objectMapper.createObjectNode();
        ObjectNode data = body.putObject("data");
        data.put("quotationId", quotationId);

        ObjectNode sender = data.putObject("sender");
        sender.put("stopId", senderStopId);
        sender.put("name", senderName);
        sender.put("phone", senderPhone);

        ObjectNode recipient = objectMapper.createObjectNode();
        recipient.put("stopId", recipientStopId);
        recipient.put("name", recipientName);
        recipient.put("phone", recipientPhone);
        if (remarks != null && !remarks.isBlank()) {
            recipient.put("remarks", remarks);
        }
        data.putArray("recipients").add(recipient);

        String bodyJson;
        try {
            bodyJson = objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build Lalamove order request", e);
        }

        JsonNode responseData = parseJson(signedRequest("POST", path, bodyJson)).path("data");
        String lalamoveOrderId = responseData.path("orderId").asText(null);
        String status = responseData.path("status").asText(null);
        String shareLink = responseData.path("shareLink").asText(null);

        if (lalamoveOrderId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Lalamove did not return a valid order id.");
        }

        return new LalamoveOrder(lalamoveOrderId, status, shareLink);
    }

    private ObjectNode stopNode(BigDecimal lat, BigDecimal lng, String address) {
        ObjectNode stop = objectMapper.createObjectNode();
        ObjectNode coordinates = stop.putObject("coordinates");
        coordinates.put("lat", lat.toPlainString());
        coordinates.put("lng", lng.toPlainString());
        stop.put("address", address);
        return stop;
    }

    private JsonNode parseJson(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not read Lalamove's response.", e);
        }
    }

    // Lalamove's own error ids (from their v3 error responses), mapped to a message a customer can
    // actually act on. Anything not listed here falls back to a generic message — the raw
    // Lalamove response is logged server-side for debugging but never shown to the customer.
    private static final Map<String, String> FRIENDLY_ERROR_MESSAGES = Map.of(
            "ERR_OUT_OF_SERVICE_AREA", "Sorry, we don't currently deliver to that address. Please try a nearby landmark or double-check the address.",
            "ERR_INVALID_QUOTATION", "That delivery quote has expired — please request a new one.",
            "ERR_INSUFFICIENT_BALANCE", "Delivery is temporarily unavailable — please try again shortly or contact the store."
    );

    private String signedRequest(String method, String path, String body) {
        long timestamp = System.currentTimeMillis();
        String token = signer.sign(apiKey, apiSecret, timestamp, method, path, body);

        try {
            if ("GET".equals(method)) {
                return restClient.get().uri(path)
                        .header("Authorization", "hmac " + token)
                        .header("MARKET", market)
                        .header("Accept", "application/json")
                        .retrieve()
                        .body(String.class);
            }
            return restClient.post().uri(path)
                    .header("Authorization", "hmac " + token)
                    .header("MARKET", market)
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("Accept", "application/json")
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException e) {
            String rawBody = e.getResponseBodyAsString();
            System.err.println("[Lalamove] " + method + " " + path + " -> " + e.getStatusCode() + ": " + rawBody);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, friendlyMessage(rawBody), e);
        } catch (Exception e) {
            System.err.println("[Lalamove] " + method + " " + path + " -> " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Lalamove right now — please try again.", e);
        }
    }

    private String friendlyMessage(String rawBody) {
        try {
            JsonNode errors = objectMapper.readTree(rawBody).path("errors");
            String errorId = errors.path(0).path("id").asText(null);
            if (errorId != null && FRIENDLY_ERROR_MESSAGES.containsKey(errorId)) {
                return FRIENDLY_ERROR_MESSAGES.get(errorId);
            }
        } catch (Exception ignored) {
            // Not the JSON shape we expect — fall through to the generic message below.
        }
        return "Could not get a delivery quote right now — please try again.";
    }
}
