package com.bakery.order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record OrderItemRequestDto(
        @NotNull Long productId,
        @Min(1) int quantity,
        Map<String, String> selectedOptions
) {
}
