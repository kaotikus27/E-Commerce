package com.bakery.faq;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only FAQ management (add/edit/delete/toggle) for the storefront FAQ page. */
@RestController
@RequestMapping("/api/v1/admin/faqs")
@RequiredArgsConstructor
public class AdminFaqController {

    private final FaqService faqService;

    @GetMapping
    public List<FaqDto> getAllFaqs() {
        return faqService.getAllFaqs();
    }

    @PostMapping
    public ResponseEntity<FaqDto> createFaq(@Valid @RequestBody FaqRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(faqService.createFaq(request));
    }

    @PutMapping("/{id}")
    public FaqDto updateFaq(@PathVariable Long id, @Valid @RequestBody FaqRequestDto request) {
        return faqService.updateFaq(id, request);
    }

    @PatchMapping("/{id}/active")
    public FaqDto setActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest request) {
        return faqService.setActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFaq(@PathVariable Long id) {
        faqService.deleteFaq(id);
        return ResponseEntity.noContent().build();
    }
}
