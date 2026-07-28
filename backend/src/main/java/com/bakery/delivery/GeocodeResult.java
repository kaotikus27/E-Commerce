package com.bakery.delivery;

import java.math.BigDecimal;

/** Result of a Google Geocoding API lookup — internal to the backend, not exposed directly. */
public record GeocodeResult(String formattedAddress, BigDecimal latitude, BigDecimal longitude) {
}
