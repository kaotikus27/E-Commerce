package com.bakery.promotion;

public record PromotionDto(
        Long id,
        String title,
        String description,
        String buttonLabel,
        String buttonLink,
        boolean active,
        int sortOrder
) {
    public static PromotionDto from(Promotion p) {
        return new PromotionDto(
                p.getId(),
                p.getTitle(),
                p.getDescription(),
                p.getButtonLabel(),
                p.getButtonLink(),
                p.isActive(),
                p.getSortOrder()
        );
    }
}
