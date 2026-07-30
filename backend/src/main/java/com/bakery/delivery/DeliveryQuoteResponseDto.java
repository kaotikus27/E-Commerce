package com.bakery.delivery;

import java.math.BigDecimal;
import java.time.Instant;

public record DeliveryQuoteResponseDto(
        String quotationId,
        String resolvedAddress,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal feeTotal,
        Instant expiresAt,
        String serviceType,
        /** Free, keyless Google Maps deep link so the customer can visually verify the pinned
         *  location on their own device — no Static Maps API call, no key exposed to the browser. */
        String googleMapsRouteUrl
) {
    public static DeliveryQuoteResponseDto from(DeliveryQuote quote, String googleMapsRouteUrl) {
        return new DeliveryQuoteResponseDto(
                quote.getQuotationId(), quote.getDestinationAddress(), quote.getLatitude(), quote.getLongitude(),
                quote.getFeeTotal(), quote.getExpiresAt(), quote.getServiceType(), googleMapsRouteUrl
        );
    }
}
