package com.bakery.promotion;

import jakarta.validation.constraints.NotBlank;

public record PromotionRequestDto(
        @NotBlank String title,
        String description,
        String buttonLabel,
        String buttonLink,
        boolean active,
        int sortOrder
) {
}
