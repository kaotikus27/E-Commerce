package com.bakery.catalog;

public record CategoryDto(Long id, String name, String icon) {
    public static CategoryDto from(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getIcon());
    }
}
