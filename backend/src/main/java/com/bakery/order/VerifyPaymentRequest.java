package com.bakery.order;

/** Admin's confirmed GCash reference number, saved as the order's official value once verified. */
public record VerifyPaymentRequest(String confirmedReference) {
}
