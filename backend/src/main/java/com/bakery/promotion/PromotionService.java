package com.bakery.promotion;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;

    public List<PromotionDto> getActivePromotions() {
        return promotionRepository.findByActiveTrueOrderBySortOrderAsc().stream().map(PromotionDto::from).toList();
    }

    public List<PromotionDto> getAllPromotions() {
        return promotionRepository.findAllByOrderBySortOrderAsc().stream().map(PromotionDto::from).toList();
    }

    @Transactional
    public PromotionDto createPromotion(PromotionRequestDto request) {
        Promotion promotion = Promotion.builder()
                .title(request.title())
                .description(request.description())
                .buttonLabel(request.buttonLabel())
                .buttonLink(request.buttonLink())
                .active(request.active())
                .sortOrder(request.sortOrder())
                .build();
        return PromotionDto.from(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionDto updatePromotion(Long id, PromotionRequestDto request) {
        Promotion promotion = findOrThrow(id);
        promotion.setTitle(request.title());
        promotion.setDescription(request.description());
        promotion.setButtonLabel(request.buttonLabel());
        promotion.setButtonLink(request.buttonLink());
        promotion.setActive(request.active());
        promotion.setSortOrder(request.sortOrder());
        return PromotionDto.from(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionDto setActive(Long id, boolean active) {
        Promotion promotion = findOrThrow(id);
        promotion.setActive(active);
        return PromotionDto.from(promotionRepository.save(promotion));
    }

    @Transactional
    public void deletePromotion(Long id) {
        promotionRepository.delete(findOrThrow(id));
    }

    private Promotion findOrThrow(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion " + id + " not found"));
    }
}
