package com.bakery.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponseDto(
        String id,
        /** Unguessable tracking id — the frontend must use THIS, not id, in any customer-facing
         *  URL. See Order.publicToken. */
        String publicToken,
        OrderStatus status,
        String guestName,
        String guestPhone,
        String guestEmail,
        String pickupTime,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,
        List<OrderItemResponseDto> items,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal total,
        String promoCode,
        BigDecimal discountAmount,
        Instant createdAt,
        String cancelReason,
        String notes,
        String gcashReference,
        String receiptImagePath,
        String ocrExtractedRef,
        FulfillmentType fulfillmentType,
        String deliveryAddress,
        BigDecimal deliveryFee,
        String deliveryUnitDetails,
        DeliveryStatus deliveryStatus,
        String driverName,
        String driverPhone,
        String driverPlateNumber,
        String trackingShareLink
) {
    /** Full view — ADMIN ONLY. Includes payment-verification internals (GCash reference, the raw
     *  OCR read, and the receipt image path) that must never reach an unauthenticated caller. */
    public static OrderResponseDto from(Order order) {
        return build(order, true);
    }

    /** Customer-facing view, reachable with only the publicToken. Payment-verification internals
     *  are stripped: the reference and OCR read are staff cross-check material, and the receipt
     *  path is now served through an admin-authenticated endpoint. */
    public static OrderResponseDto publicView(Order order) {
        return build(order, false);
    }

    private static OrderResponseDto build(Order order, boolean includePaymentInternals) {
        List<OrderItemResponseDto> items = order.getItems().stream().map(OrderItemResponseDto::from).toList();
        return new OrderResponseDto(
                order.getOrderNumber(), order.getPublicToken(), order.getStatus(),
                order.getGuestName(), order.getGuestPhone(),
                order.getGuestEmail(), order.getPickupTime(), order.getPaymentMethod(), order.getPaymentStatus(), items,
                order.getSubtotal(), order.getTax(), order.getTotal(), order.getPromoCode(), order.getDiscountAmount(), order.getCreatedAt(),
                order.getCancelReason(), order.getNotes(),
                includePaymentInternals ? order.getGcashReference() : null,
                includePaymentInternals ? order.getReceiptImagePath() : null,
                includePaymentInternals ? order.getOcrExtractedRef() : null,
                order.getFulfillmentType(), order.getDeliveryAddress(), order.getDeliveryFee(),
                order.getDeliveryUnitDetails(), order.getDeliveryStatus(),
                order.getDriverName(), order.getDriverPhone(), order.getDriverPlateNumber(), order.getTrackingShareLink()
        );
    }
}
