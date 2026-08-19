package com.bakery.order;

import jakarta.validation.constraints.NotBlank;

public record OrderLookupRequestDto(
        @NotBlank String orderNumber,
        @NotBlank String guestPhone
) {
}
