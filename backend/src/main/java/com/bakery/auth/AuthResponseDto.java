package com.bakery.auth;

public record AuthResponseDto(String token, UserDto user) {
}
