package com.bakery.contactmessage;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactMessageRequestDto(
        @NotBlank String name,
        @NotBlank @Email String email,
        String phone,
        String topic,
        @NotBlank @Size(max = 2000) String message
) {
}
