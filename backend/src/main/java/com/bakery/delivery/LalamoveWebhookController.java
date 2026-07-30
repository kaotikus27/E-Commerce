package com.bakery.delivery;

import com.bakery.order.DeliveryStatus;
import com.bakery.order.OrderService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Enumeration;

/**
 * Receives Lalamove's ORDER_STATUS_CHANGED / DRIVER_ASSIGNED webhook events (Phase 2).
 *
 * Stage 1 (current): logs every header and the exact raw body of the first real incoming calls
 * so the actual signature scheme and payload shape can be confirmed empirically — Lalamove's
 * webhook signature verification isn't documented anywhere machine-readable we could find, and
 * guessing it risks either rejecting every real webhook or a false sense of security. No
 * signature check yet. Once real traffic has been observed, this gets hardened (Stage 2) before
 * ever pointing at production. The body is read as a raw String, not deserialized directly, since
 * signature verification (once added) needs the exact bytes Lalamove signed.
 */
@RestController
@RequestMapping("/api/v1/lalamove")
@RequiredArgsConstructor
public class LalamoveWebhookController {

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @PostMapping("/webhook")
    public String receiveWebhook(@RequestBody String rawPayload, HttpServletRequest request) {
        logIncomingRequest(request, rawPayload);

        try {
            applyEvent(rawPayload);
        } catch (Exception e) {
            System.err.println("[Lalamove webhook] Failed to process event: " + e.getMessage());
        }

        // Lalamove requires a prompt 200 regardless of internal processing outcome, to avoid
        // needless retries for something a retry can't fix (e.g. an event we don't recognize yet).
        return "OK";
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

    /** Best-effort parse — field locations are our best guess from Lalamove's general API
     *  conventions, not a confirmed sample payload. Expect to adjust once Stage 1 logs a real one. */
    private void applyEvent(String rawPayload) throws Exception {
        JsonNode root = objectMapper.readTree(rawPayload);
        String eventType = root.path("eventType").asText(null);
        if (eventType == null) return;

        JsonNode data = root.path("data");
        JsonNode orderNode = data.has("order") ? data.path("order") : data;
        String lalamoveOrderId = orderNode.path("orderId").asText(null);
        if (lalamoveOrderId == null) return;

        if ("ORDER_STATUS_CHANGED".equals(eventType)) {
            DeliveryStatus status = parseStatus(orderNode.path("status").asText(null));
            orderService.applyDeliveryWebhookUpdate(lalamoveOrderId, status, null, null, null, null);
        } else if ("DRIVER_ASSIGNED".equals(eventType)) {
            JsonNode driver = data.path("driver");
            String driverName = driver.path("name").asText(null);
            String driverPhone = driver.path("phone").asText(null);
            String driverPlateNumber = driver.path("plateNumber").asText(null);
            String shareLink = data.path("shareLink").asText(null);
            orderService.applyDeliveryWebhookUpdate(lalamoveOrderId, null, driverName, driverPhone, driverPlateNumber, shareLink);
        }
    }

    private DeliveryStatus parseStatus(String lalamoveStatus) {
        if (lalamoveStatus == null) return null;
        try {
            return DeliveryStatus.valueOf(lalamoveStatus);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
