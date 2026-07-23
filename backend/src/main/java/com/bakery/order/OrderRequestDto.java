package com.bakery.order;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record OrderRequestDto(
        String guestName,
        String guestPhone,
        @NotNull String pickupTime,
        @NotNull PaymentMethod paymentMethod,
        @NotEmpty List<OrderItemRequestDto> items
) {
}
