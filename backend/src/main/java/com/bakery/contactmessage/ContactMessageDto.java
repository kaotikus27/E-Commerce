package com.bakery.contactmessage;

import java.time.Instant;

public record ContactMessageDto(
        Long id,
        String name,
        String email,
        String phone,
        String topic,
        String message,
        Instant createdAt,
        boolean read
) {
    public static ContactMessageDto from(ContactMessage m) {
        return new ContactMessageDto(m.getId(), m.getName(), m.getEmail(), m.getPhone(), m.getTopic(), m.getMessage(), m.getCreatedAt(), m.isRead());
    }
}
