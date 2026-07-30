package com.bakery.delivery;

/** Result of a Lalamove POST /v3/orders call — internal to the backend, not exposed directly. */
public record LalamoveOrder(String lalamoveOrderId, String status, String shareLink) {
}
