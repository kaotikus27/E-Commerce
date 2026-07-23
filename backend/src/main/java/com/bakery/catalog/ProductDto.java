package com.bakery.catalog;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

public record ProductDto(
        Long id,
        String name,
        String description,
        BigDecimal price,
        Long categoryId,
        String categoryName,
        String image,
        List<String> badges,
        double rating,
        List<CustomizationDto> customizations,
        boolean available
) {
    public static ProductDto from(Product p) {
        List<String> badges = p.getBadgesCsv() == null || p.getBadgesCsv().isBlank()
                ? List.of()
                : Arrays.asList(p.getBadgesCsv().split(","));

        List<CustomizationDto> customizations = p.getCustomizations().stream()
                .map(CustomizationDto::from)
                .toList();

        return new ProductDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getCategory().getId(),
                p.getCategory().getName(),
                p.getImage(),
                badges,
                p.getRating(),
                customizations,
                p.isAvailable()
        );
    }
}
