package com.bakery.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponseDto(
        String id,
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
    public static OrderResponseDto from(Order order) {
        List<OrderItemResponseDto> items = order.getItems().stream().map(OrderItemResponseDto::from).toList();
        return new OrderResponseDto(
                order.getOrderNumber(), order.getStatus(), order.getGuestName(), order.getGuestPhone(),
                order.getGuestEmail(), order.getPickupTime(), order.getPaymentMethod(), order.getPaymentStatus(), items,
                order.getSubtotal(), order.getTax(), order.getTotal(), order.getCreatedAt(),
                order.getCancelReason(), order.getNotes(), order.getGcashReference(),
                order.getReceiptImagePath(), order.getOcrExtractedRef(),
                order.getFulfillmentType(), order.getDeliveryAddress(), order.getDeliveryFee(),
                order.getDeliveryUnitDetails(), order.getDeliveryStatus(),
                order.getDriverName(), order.getDriverPhone(), order.getDriverPlateNumber(), order.getTrackingShareLink()
        );
    }
}
