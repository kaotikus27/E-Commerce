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
        String serviceType
) {
    public static DeliveryQuoteResponseDto from(DeliveryQuote quote) {
        return new DeliveryQuoteResponseDto(
                quote.getQuotationId(), quote.getDestinationAddress(), quote.getLatitude(), quote.getLongitude(),
                quote.getFeeTotal(), quote.getExpiresAt(), quote.getServiceType()
        );
    }
}
