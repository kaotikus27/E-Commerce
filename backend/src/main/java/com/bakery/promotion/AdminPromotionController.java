package com.bakery.promotion;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only promo banner management (add/edit/delete/toggle) for the homepage promo section. */
@RestController
@RequestMapping("/api/v1/admin/promotions")
@RequiredArgsConstructor
public class AdminPromotionController {

    private final PromotionService promotionService;

    @GetMapping
    public List<PromotionDto> getAllPromotions() {
        return promotionService.getAllPromotions();
    }

    @PostMapping
    public ResponseEntity<PromotionDto> createPromotion(@Valid @RequestBody PromotionRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.createPromotion(request));
    }

    @PutMapping("/{id}")
    public PromotionDto updatePromotion(@PathVariable Long id, @Valid @RequestBody PromotionRequestDto request) {
        return promotionService.updatePromotion(id, request);
    }

    @PatchMapping("/{id}/active")
    public PromotionDto setActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest request) {
        return promotionService.setActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromotion(@PathVariable Long id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }
}
