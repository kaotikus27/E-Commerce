package com.bakery.order;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderRequestDto(
        String guestName,
        String guestPhone,
        @Email String guestEmail,
        @NotNull String pickupTime,
        @NotNull PaymentMethod paymentMethod,
        @NotEmpty List<OrderItemRequestDto> items,
        @Size(max = 150) String notes,
        String gcashReference
) {
}
