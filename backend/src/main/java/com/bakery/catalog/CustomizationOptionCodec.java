package com.bakery.catalog;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Encodes/decodes a Customization's priced option list to/from optionsCsv, e.g.
 * "Whole:0,Oat:20,Almond:25,Skim:0". Decode tolerates the pre-pricing format (bare names,
 * no colon) as priceDelta=0, so existing rows keep working until next saved through the
 * admin form.
 */
public final class CustomizationOptionCodec {

    private CustomizationOptionCodec() {}

    public record PricedOption(String name, BigDecimal priceDelta) {}

    static String encode(List<PricedOption> options) {
        if (options == null || options.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (PricedOption opt : options) {
            if (sb.length() > 0) sb.append(',');
            sb.append(opt.name()).append(':').append(opt.priceDelta().stripTrailingZeros().toPlainString());
        }
        return sb.toString();
    }

    public static List<PricedOption> decode(String csv) {
        List<PricedOption> result = new ArrayList<>();
        if (csv == null || csv.isBlank()) return result;
        for (String segment : csv.split(",")) {
            if (segment.isBlank()) continue;
            String[] parts = segment.split(":", 2);
            String name = parts[0];
            BigDecimal price = parts.length == 2 ? new BigDecimal(parts[1]) : BigDecimal.ZERO;
            result.add(new PricedOption(name, price));
        }
        return result;
    }
}
