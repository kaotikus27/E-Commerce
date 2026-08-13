package com.bakery.order;

/** Third orthogonal state machine alongside OrderStatus/PaymentStatus, driven by Lalamove's
 *  ORDER_STATUS_CHANGED webhook events (or a manual/poll sync of the same data). NOT_DISPATCHED
 *  until an admin calls a rider. */
public enum DeliveryStatus {
    NOT_DISPATCHED, ASSIGNING_DRIVER, ON_GOING, PICKED_UP, COMPLETED, REJECTED, CANCELED;

    /** Parses Lalamove's own wire strings for order status — spelled identically to this enum's
     *  names, confirmed against real webhook/API payloads — returning null for anything
     *  unrecognized rather than throwing, so callers can decide how to handle an unknown status.
     *  Shared by the webhook path and the manual/poll sync path so both parse the same way. */
    public static DeliveryStatus fromLalamove(String raw) {
        if (raw == null) return null;
        try {
            return DeliveryStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
