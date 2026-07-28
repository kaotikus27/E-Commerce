package com.bakery.delivery;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/** Builds the "hmac key:timestamp:signature" token Lalamove's v3 API expects in the Authorization
 *  header, per their documented/reference signing scheme (timestamp+method+path+body, hex digest). */
@Component
public class LalamoveHmacSigner {

    public String sign(String apiKey, String apiSecret, long timestampMillis, String method, String path, String body) {
        String rawSignature = timestampMillis + "\r\n" + method + "\r\n" + path + "\r\n\r\n" + body;
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = hmac.doFinal(rawSignature.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder();
            for (byte b : raw) {
                hex.append(Integer.toHexString((b & 0xFF) | 0x100), 1, 3);
            }

            return apiKey + ":" + timestampMillis + ":" + hex;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign Lalamove request", e);
        }
    }
}
