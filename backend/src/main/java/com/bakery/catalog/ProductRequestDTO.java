package com.bakery.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Admin create/edit payload. {@code customizationKeys} selects from the fixed set of
 * pre-defined customization templates ("MILK", "SUGAR", "TEMP") rather than authoring
 * new arbitrary customization groups, since {@link Customization} is an embedded
 * value object per-product, not a shared reusable entity. {@code customizationPrices}
 * carries this product's own per-option surcharge (e.g. "MILK" -> "Oat" -> 20.00) for
 * whichever of those keys are active — a preset's option names/required-ness are fixed,
 * but its prices are per-product. Missing entries default to no surcharge.
 */
public record ProductRequestDTO(
        @NotBlank String name,
        String description,
        @NotNull @Positive BigDecimal price,
        @NotNull Long categoryId,
        String image,
        List<String> badges,
        boolean available,
        List<String> customizationKeys,
        Map<String, Map<String, BigDecimal>> customizationPrices
) {
}
