package com.bakery.contactmessage;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public contact-form submission — the Contact page's "Send Us a Message" form. */
@RestController
@RequestMapping("/api/v1/contact-messages")
@RequiredArgsConstructor
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    @PostMapping
    public ResponseEntity<ContactMessageDto> submit(@Valid @RequestBody ContactMessageRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contactMessageService.submit(request));
    }
}
