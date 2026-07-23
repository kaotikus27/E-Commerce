package com.bakery.order;

import java.util.LinkedHashMap;
import java.util.Map;

/** Encodes/decodes a product's selected customization options to a compact string for storage. */
final class OrderOptionCodec {

    private OrderOptionCodec() {}

    static String encode(Map<String, String> options) {
        if (options == null || options.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        options.forEach((k, v) -> {
            if (sb.length() > 0) sb.append(';');
            sb.append(k).append(':').append(v);
        });
        return sb.toString();
    }

    static Map<String, String> decode(String csv) {
        Map<String, String> result = new LinkedHashMap<>();
        if (csv == null || csv.isBlank()) return result;
        for (String pair : csv.split(";")) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) result.put(kv[0], kv[1]);
        }
        return result;
    }
}
