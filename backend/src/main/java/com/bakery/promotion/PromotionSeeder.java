package com.bakery.promotion;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds the starter promo banner (migrated from the old hardcoded homepage copy) on boot. */
@Component
@RequiredArgsConstructor
public class PromotionSeeder implements CommandLineRunner {

    private final PromotionRepository promotionRepository;

    @Override
    public void run(String... args) {
        if (promotionRepository.count() > 0) return;

        promotionRepository.save(Promotion.builder()
                .title("10% OFF Iced Mana — This Week Only")
                .description("Use code CHILL10 at checkout on any Iced Mana item.")
                .buttonLabel("Shop Iced Mana")
                .buttonLink("/shop?category=2")
                .active(true)
                .sortOrder(0)
                .build());
    }
}
