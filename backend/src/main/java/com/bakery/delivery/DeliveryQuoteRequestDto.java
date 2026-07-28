package com.bakery.delivery;

import jakarta.validation.constraints.NotBlank;

public record DeliveryQuoteRequestDto(
        @NotBlank String address,
        String serviceType
) {
}
