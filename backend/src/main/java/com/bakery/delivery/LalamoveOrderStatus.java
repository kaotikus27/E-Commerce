package com.bakery.delivery;

/** Result of a Lalamove GET /v3/orders/{orderId} call — used by the manual/poll sync path, not
 *  the webhook flow. driverId is Lalamove's internal reference only; the driver's actual
 *  name/phone/plate require a separate GET /v3/orders/{orderId}/drivers/{driverId} call. */
public record LalamoveOrderStatus(String status, String shareLink, String driverId) {
}
