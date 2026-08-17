package com.bakery.promocode;

import java.math.BigDecimal;

public record PromoValidationResponseDto(
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal discountAmount
) {
}
