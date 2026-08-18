package com.bakery.contactmessage;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactMessageService {

    private final ContactMessageRepository contactMessageRepository;

    @Transactional
    public ContactMessageDto submit(ContactMessageRequestDto request) {
        ContactMessage message = ContactMessage.builder()
                .name(request.name().trim())
                .email(request.email().trim())
                .phone(request.phone() != null ? request.phone().trim() : null)
                .topic(request.topic())
                .message(request.message().trim())
                .createdAt(Instant.now())
                .read(false)
                .build();
        return ContactMessageDto.from(contactMessageRepository.save(message));
    }

    public List<ContactMessageDto> getAllMessages() {
        return contactMessageRepository.findAllByOrderByCreatedAtDesc().stream().map(ContactMessageDto::from).toList();
    }

    @Transactional
    public ContactMessageDto setRead(Long id, boolean read) {
        ContactMessage message = findOrThrow(id);
        message.setRead(read);
        return ContactMessageDto.from(contactMessageRepository.save(message));
    }

    @Transactional
    public void deleteMessage(Long id) {
        contactMessageRepository.delete(findOrThrow(id));
    }

    private ContactMessage findOrThrow(Long id) {
        return contactMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact message " + id + " not found"));
    }
}
