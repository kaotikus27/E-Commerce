package com.bakery.order;

/** Third orthogonal state machine alongside OrderStatus/PaymentStatus, driven by Lalamove's
 *  ORDER_STATUS_CHANGED webhook events. NOT_DISPATCHED until an admin calls a rider. */
public enum DeliveryStatus {
    NOT_DISPATCHED, ASSIGNING_DRIVER, ON_GOING, PICKED_UP, COMPLETED, REJECTED, CANCELED
}
