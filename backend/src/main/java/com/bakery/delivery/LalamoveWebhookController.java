package com.bakery.delivery;

import com.bakery.order.DeliveryStatus;
import com.bakery.order.OrderService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Enumeration;

/**
 * Receives Lalamove's ORDER_STATUS_CHANGED / DRIVER_ASSIGNED webhook events (Phase 2).
 *
 * Stage 2 (current): verifies each event's inline apiKey/timestamp/signature against our own
 * secret before trusting it, per Lalamove's webhook tutorial (HMAC-SHA256 over
 * "timestamp\r\nPOST\r\n<webhook path>\r\n\r\n<JSON.stringify(data)>"), confirmed against real
 * captured payloads. Every request still logs its headers/raw body and always returns 200 (even
 * on a bad signature or an event we don't recognize) — Lalamove disables the URL after enough
 * non-200 responses, and a retry can't fix a payload we've already rejected. The body is read as
 * a raw String, not deserialized directly by Spring, since verification needs Lalamove's exact
 * original bytes.
 */
@RestController
@RequestMapping("/api/v1/lalamove")
@RequiredArgsConstructor
public class LalamoveWebhookController {

    private static final String WEBHOOK_PATH = "/api/v1/lalamove/webhook";

    private final OrderService orderService;
    private final ObjectMapper objectMapper;
    private final LalamoveHmacSigner hmacSigner;

    @Value("${lalamove.api-secret}")
    private String apiSecret;

    /** Lalamove's own webhook-registration flow (PATCH /v3/webhook) probes the URL with a
     *  non-POST request before accepting it — confirmed live: registration failed with
     *  "ERR_INVALID_RESPONSE / Non-200 response received" while this endpoint only mapped POST,
     *  which Spring answers with a 500 for any other verb. This handler exists purely so that
     *  reachability probe sees a 200; it carries no event data and updates nothing. */
    @GetMapping("/webhook")
    public String webhookReachabilityCheck() {
        return "OK";
    }

    @PostMapping("/webhook")
    public String receiveWebhook(@RequestBody String rawPayload, HttpServletRequest request) {
        logIncomingRequest(request, rawPayload);

        try {
            if (isSignatureValid(rawPayload)) {
                applyEvent(rawPayload);
            } else {
                System.err.println("[Lalamove webhook] Signature invalid or missing — ignoring event.");
            }
        } catch (Exception e) {
            System.err.println("[Lalamove webhook] Failed to process event: " + e.getMessage());
        }

        // Lalamove requires a prompt 200 regardless of internal processing outcome, to avoid
        // needless retries for something a retry can't fix (e.g. a bad signature or an
        // unrecognized event) — see class Javadoc.
        return "OK";
    }

    private boolean isSignatureValid(String rawPayload) throws Exception {
        JsonNode root = objectMapper.readTree(rawPayload);
        long timestamp = root.path("timestamp").asLong(-1);
        String signature = root.path("signature").asText(null);
        if (timestamp < 0 || signature == null) return false;

        String body = objectMapper.writeValueAsString(root.path("data"));
        return hmacSigner.verifyWebhookSignature(apiSecret, timestamp, WEBHOOK_PATH, body, signature);
    }

    private void logIncomingRequest(HttpServletRequest request, String rawPayload) {
        System.out.println("[Lalamove webhook] Incoming request headers:");
        Enumeration<String> headerNames = request.getHeaderNames() != null ? request.getHeaderNames() : Collections.emptyEnumeration();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            System.out.println("  " + name + ": " + request.getHeader(name));
        }
        System.out.println("[Lalamove webhook] Raw body: " + rawPayload);
    }

    /** Field locations confirmed against Lalamove's official webhook tutorial + a real captured
     *  ORDER_STATUS_CHANGED/DRIVER_ASSIGNED/WALLET_BALANCE_CHANGED/ORDER_CREATED sequence. Other
     *  event types (ORDER_AMOUNT_CHANGED, ORDER_REPLACED, WALLET_BALANCE_CHANGED, ORDER_CREATED)
     *  fall through untouched — nothing in our data model tracks them yet. */
    private void applyEvent(String rawPayload) throws Exception {
        JsonNode root = objectMapper.readTree(rawPayload);
        String eventType = root.path("eventType").asText(null);
        if (eventType == null) return;

        JsonNode data = root.path("data");
        JsonNode orderNode = data.path("order");
        String lalamoveOrderId = orderNode.path("orderId").asText(null);
        if (lalamoveOrderId == null) return;

        if ("ORDER_STATUS_CHANGED".equals(eventType)) {
            DeliveryStatus status = DeliveryStatus.fromLalamove(orderNode.path("status").asText(null));
            String shareLink = orderNode.path("shareLink").asText(null);
            orderService.applyDeliveryWebhookUpdate(lalamoveOrderId, status, null, null, null, shareLink);
        } else if ("DRIVER_ASSIGNED".equals(eventType)) {
            JsonNode driver = data.path("driver");
            String driverName = driver.path("name").asText(null);
            String driverPhone = driver.path("phone").asText(null);
            String driverPlateNumber = driver.path("plateNumber").asText(null);
            orderService.applyDeliveryWebhookUpdate(lalamoveOrderId, null, driverName, driverPhone, driverPlateNumber, null);
        }
    }
}
