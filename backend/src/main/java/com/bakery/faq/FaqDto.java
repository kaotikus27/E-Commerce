package com.bakery.faq;

public record FaqDto(
        Long id,
        String question,
        String answer,
        boolean active,
        int sortOrder
) {
    public static FaqDto from(Faq f) {
        return new FaqDto(f.getId(), f.getQuestion(), f.getAnswer(), f.isActive(), f.getSortOrder());
    }
}
