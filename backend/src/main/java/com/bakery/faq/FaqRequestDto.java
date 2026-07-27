package com.bakery.faq;

import jakarta.validation.constraints.NotBlank;

public record FaqRequestDto(
        @NotBlank String question,
        @NotBlank String answer,
        boolean active,
        int sortOrder
) {
}
