package com.bakery.delivery;

import java.util.List;

/** Response from a delivery-quote request — either a resolved {@code quote}, or a list of
 *  {@code candidates} when the searched address was genuinely ambiguous (e.g. a landmark name
 *  that matches places in more than one city) and the customer needs to pick the right one. */
public record DeliveryQuoteResultDto(DeliveryQuoteResponseDto quote, List<GeocodeCandidateDto> candidates) {
    public static DeliveryQuoteResultDto resolved(DeliveryQuoteResponseDto quote) {
        return new DeliveryQuoteResultDto(quote, null);
    }

    public static DeliveryQuoteResultDto ambiguous(List<GeocodeCandidateDto> candidates) {
        return new DeliveryQuoteResultDto(null, candidates);
    }
}
