package com.bakery.promocode;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PromoCodeRequestDto(
        @NotBlank String code,
        @NotNull DiscountType discountType,
        @NotNull @DecimalMin(value = "0.01") BigDecimal discountValue,
        boolean active
) {
}
