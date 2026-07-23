package com.bakery.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponseDto(
        String id,
        OrderStatus status,
        String guestName,
        String guestPhone,
        String pickupTime,
        PaymentMethod paymentMethod,
        List<OrderItemResponseDto> items,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal total,
        Instant createdAt
) {
    public static OrderResponseDto from(Order order) {
        List<OrderItemResponseDto> items = order.getItems().stream().map(OrderItemResponseDto::from).toList();
        return new OrderResponseDto(
                order.getOrderNumber(), order.getStatus(), order.getGuestName(), order.getGuestPhone(),
                order.getPickupTime(), order.getPaymentMethod(), items,
                order.getSubtotal(), order.getTax(), order.getTotal(), order.getCreatedAt()
        );
    }
}
