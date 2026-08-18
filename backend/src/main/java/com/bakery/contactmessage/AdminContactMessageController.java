package com.bakery.contactmessage;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only contact-message inbox (read/list/delete). No edit — these are submitted by customers, not admin-authored content. */
@RestController
@RequestMapping("/api/v1/admin/contact-messages")
@RequiredArgsConstructor
public class AdminContactMessageController {

    private final ContactMessageService contactMessageService;

    @GetMapping
    public List<ContactMessageDto> getAllMessages() {
        return contactMessageService.getAllMessages();
    }

    @PatchMapping("/{id}/read")
    public ContactMessageDto setRead(@PathVariable Long id, @Valid @RequestBody ReadRequest request) {
        return contactMessageService.setRead(id, request.read());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        contactMessageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
