package com.bakery.promocode;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only promo code management (add/edit/delete/toggle). */
@RestController
@RequestMapping("/api/v1/admin/promo-codes")
@RequiredArgsConstructor
public class AdminPromoCodeController {

    private final PromoCodeService promoCodeService;

    @GetMapping
    public List<PromoCodeDto> getAllPromoCodes() {
        return promoCodeService.getAllPromoCodes();
    }

    @PostMapping
    public ResponseEntity<PromoCodeDto> createPromoCode(@Valid @RequestBody PromoCodeRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promoCodeService.createPromoCode(request));
    }

    @PutMapping("/{id}")
    public PromoCodeDto updatePromoCode(@PathVariable Long id, @Valid @RequestBody PromoCodeRequestDto request) {
        return promoCodeService.updatePromoCode(id, request);
    }

    @PatchMapping("/{id}/active")
    public PromoCodeDto setActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest request) {
        return promoCodeService.setActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromoCode(@PathVariable Long id) {
        promoCodeService.deletePromoCode(id);
        return ResponseEntity.noContent().build();
    }
}
