package com.bakery.promocode;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PromoCodeService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final PromoCodeRepository promoCodeRepository;

    public List<PromoCodeDto> getAllPromoCodes() {
        return promoCodeRepository.findAllByOrderByCodeAsc().stream().map(PromoCodeDto::from).toList();
    }

    @Transactional
    public PromoCodeDto createPromoCode(PromoCodeRequestDto request) {
        String normalizedCode = normalizeCode(request.code());
        if (promoCodeRepository.findByCodeIgnoreCase(normalizedCode).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A promo code \"" + normalizedCode + "\" already exists.");
        }
        PromoCode promoCode = PromoCode.builder()
                .code(normalizedCode)
                .discountType(request.discountType())
                .discountValue(request.discountValue())
                .active(request.active())
                .build();
        return PromoCodeDto.from(promoCodeRepository.save(promoCode));
    }

    @Transactional
    public PromoCodeDto updatePromoCode(Long id, PromoCodeRequestDto request) {
        PromoCode promoCode = findOrThrow(id);
        String normalizedCode = normalizeCode(request.code());
        promoCodeRepository.findByCodeIgnoreCase(normalizedCode).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A promo code \"" + normalizedCode + "\" already exists.");
            }
        });
        promoCode.setCode(normalizedCode);
        promoCode.setDiscountType(request.discountType());
        promoCode.setDiscountValue(request.discountValue());
        promoCode.setActive(request.active());
        return PromoCodeDto.from(promoCodeRepository.save(promoCode));
    }

    @Transactional
    public PromoCodeDto setActive(Long id, boolean active) {
        PromoCode promoCode = findOrThrow(id);
        promoCode.setActive(active);
        return PromoCodeDto.from(promoCodeRepository.save(promoCode));
    }

    @Transactional
    public void deletePromoCode(Long id) {
        promoCodeRepository.delete(findOrThrow(id));
    }

    /** Resolves a customer-typed code against a real subtotal, authoritatively — the discount
     *  amount is always computed here, never trusted from the client (same principle as
     *  OrderService.resolveOptionsSurcharge). Used both by the checkout-time preview endpoint and
     *  by OrderService.placeOrder itself, so the two can never disagree. */
    public PromoValidationResponseDto validate(String code, BigDecimal subtotal) {
        PromoCode promoCode = promoCodeRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That promo code doesn't exist."));

        if (!promoCode.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That promo code is no longer active.");
        }

        BigDecimal rawDiscount = promoCode.getDiscountType() == DiscountType.PERCENT
                ? subtotal.multiply(promoCode.getDiscountValue()).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP)
                : promoCode.getDiscountValue();

        // Never discount more than the order is actually worth.
        BigDecimal discountAmount = rawDiscount.min(subtotal).setScale(2, RoundingMode.HALF_UP);

        return new PromoValidationResponseDto(promoCode.getCode(), promoCode.getDiscountType(), promoCode.getDiscountValue(), discountAmount);
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }

    private PromoCode findOrThrow(Long id) {
        return promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promo code " + id + " not found"));
    }
}
