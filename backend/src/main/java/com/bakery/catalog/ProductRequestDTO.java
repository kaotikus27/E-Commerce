package com.bakery.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

/**
 * Admin create/edit payload. {@code customizationKeys} selects from the fixed set of
 * pre-defined customization templates ("MILK", "SUGAR", "TEMP") rather than authoring
 * new arbitrary customization groups, since {@link Customization} is an embedded
 * value object per-product, not a shared reusable entity.
 */
public record ProductRequestDTO(
        @NotBlank String name,
        String description,
        @NotNull @Positive BigDecimal price,
        @NotNull Long categoryId,
        String image,
        List<String> badges,
        boolean available,
        List<String> customizationKeys
) {
}
