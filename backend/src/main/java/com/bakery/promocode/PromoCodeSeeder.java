package com.bakery.promocode;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Seeds the CHILL10 code the homepage promo banner (see PromotionSeeder) already advertises. */
@Component
@RequiredArgsConstructor
public class PromoCodeSeeder implements CommandLineRunner {

    private final PromoCodeRepository promoCodeRepository;

    @Override
    public void run(String... args) {
        if (promoCodeRepository.count() > 0) return;

        promoCodeRepository.save(PromoCode.builder()
                .code("CHILL10")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("10"))
                .active(true)
                .build());
    }
}
