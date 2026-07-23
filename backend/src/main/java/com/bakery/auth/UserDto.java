package com.bakery.auth;

public record UserDto(Long id, String name, String email, String phone) {
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getPhone());
    }
}
