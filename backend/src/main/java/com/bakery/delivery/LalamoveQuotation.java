package com.bakery.delivery;

import java.math.BigDecimal;
import java.time.Instant;

/** Result of a Lalamove POST /v3/quotations call — internal to the backend, not exposed directly. */
public record LalamoveQuotation(String quotationId, BigDecimal feeTotal, Instant expiresAt) {
}
