package com.bakery.delivery;

import java.math.BigDecimal;

/** One plausible resolved location for an ambiguous address search — shown to the customer so
 *  they can pick the right one instead of us silently trusting Google's top-ranked guess. */
public record GeocodeCandidateDto(String label, BigDecimal latitude, BigDecimal longitude) {
    public static GeocodeCandidateDto from(GeocodeResult result) {
        return new GeocodeCandidateDto(result.formattedAddress(), result.latitude(), result.longitude());
    }
}
