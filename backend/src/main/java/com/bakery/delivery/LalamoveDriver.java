package com.bakery.delivery;

/** Result of a Lalamove GET /v3/orders/{orderId}/drivers/{driverId} call. */
public record LalamoveDriver(String name, String phone, String plateNumber) {
}
