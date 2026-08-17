package com.bakery.promocode;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public checkout-time promo code preview — resolves a customer-typed code against a real
 *  subtotal so the discount can be shown before the order is actually placed. The order-placement
 *  path re-validates independently; this endpoint never mutates anything. */
@RestController
@RequestMapping("/api/v1/promo-codes")
@RequiredArgsConstructor
public class PromoCodeController {

    private final PromoCodeService promoCodeService;

    @PostMapping("/validate")
    public PromoValidationResponseDto validate(@Valid @RequestBody PromoValidationRequestDto request) {
        return promoCodeService.validate(request.code(), request.subtotal());
    }
}
