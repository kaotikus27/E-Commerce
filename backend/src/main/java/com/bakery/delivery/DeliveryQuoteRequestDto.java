package com.bakery.delivery;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record DeliveryQuoteRequestDto(
        @NotBlank String address,
        String serviceType,
        /** When set (together with resolvedLabel), skips geocoding entirely and quotes this exact
         *  point instead — the customer already picked it from a disambiguation list returned by
         *  a previous call to this same endpoint. */
        BigDecimal latitude,
        BigDecimal longitude,
        String resolvedLabel
) {
}
