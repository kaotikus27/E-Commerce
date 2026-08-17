package com.bakery.promocode;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PromoValidationRequestDto(
        @NotBlank String code,
        @NotNull BigDecimal subtotal
) {
}
