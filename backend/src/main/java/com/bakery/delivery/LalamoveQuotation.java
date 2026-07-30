package com.bakery.delivery;

import java.math.BigDecimal;
import java.time.Instant;

/** Result of a Lalamove POST /v3/quotations call — internal to the backend, not exposed directly.
 *  originStopId/destinationStopId are needed to place an actual order (POST /v3/orders) against
 *  this quotation — Lalamove assigns them per-stop when the quotation is created. */
public record LalamoveQuotation(String quotationId, BigDecimal feeTotal, Instant expiresAt,
                                 String originStopId, String destinationStopId) {
}
