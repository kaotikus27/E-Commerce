package com.bakery.delivery;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Builds/verifies Lalamove's HMAC-SHA256 signature scheme (timestamp+method+path+body, hex
 *  digest) — used both for the outbound v3 API Authorization header and for verifying inbound
 *  webhook payloads, which sign the same way over their own timestamp/POST/webhook-path/body. */
@Component
public class LalamoveHmacSigner {

    public String sign(String apiKey, String apiSecret, long timestampMillis, String method, String path, String body) {
        String hex = hmacHex(apiSecret, timestampMillis + "\r\n" + method + "\r\n" + path + "\r\n\r\n" + body);
        return apiKey + ":" + timestampMillis + ":" + hex;
    }

    /** True if expectedSignature (lowercase hex) matches HMAC-SHA256 of the webhook's
     *  timestamp/POST/path/body over apiSecret, per Lalamove's webhook tutorial. */
    public boolean verifyWebhookSignature(String apiSecret, long timestampSeconds, String webhookPath, String body, String expectedSignature) {
        if (apiSecret == null || apiSecret.isBlank() || expectedSignature == null) return false;
        String actual = hmacHex(apiSecret, timestampSeconds + "\r\nPOST\r\n" + webhookPath + "\r\n\r\n" + body);
        return MessageDigest.isEqual(
                actual.getBytes(StandardCharsets.UTF_8),
                expectedSignature.toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    private String hmacHex(String secret, String rawSignature) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = hmac.doFinal(rawSignature.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder();
            for (byte b : raw) {
                hex.append(Integer.toHexString((b & 0xFF) | 0x100), 1, 3);
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute Lalamove HMAC", e);
        }
    }
}
