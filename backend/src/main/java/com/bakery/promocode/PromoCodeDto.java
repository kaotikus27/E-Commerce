package com.bakery.promocode;

import java.math.BigDecimal;

public record PromoCodeDto(
        Long id,
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        boolean active
) {
    public static PromoCodeDto from(PromoCode p) {
        return new PromoCodeDto(p.getId(), p.getCode(), p.getDiscountType(), p.getDiscountValue(), p.isActive());
    }
}
