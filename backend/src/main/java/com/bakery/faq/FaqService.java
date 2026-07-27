package com.bakery.faq;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FaqService {

    private final FaqRepository faqRepository;

    public List<FaqDto> getActiveFaqs() {
        return faqRepository.findByActiveTrueOrderBySortOrderAsc().stream().map(FaqDto::from).toList();
    }

    public List<FaqDto> getAllFaqs() {
        return faqRepository.findAllByOrderBySortOrderAsc().stream().map(FaqDto::from).toList();
    }

    @Transactional
    public FaqDto createFaq(FaqRequestDto request) {
        Faq faq = Faq.builder()
                .question(request.question())
                .answer(request.answer())
                .active(request.active())
                .sortOrder(request.sortOrder())
                .build();
        return FaqDto.from(faqRepository.save(faq));
    }

    @Transactional
    public FaqDto updateFaq(Long id, FaqRequestDto request) {
        Faq faq = findOrThrow(id);
        faq.setQuestion(request.question());
        faq.setAnswer(request.answer());
        faq.setActive(request.active());
        faq.setSortOrder(request.sortOrder());
        return FaqDto.from(faqRepository.save(faq));
    }

    @Transactional
    public FaqDto setActive(Long id, boolean active) {
        Faq faq = findOrThrow(id);
        faq.setActive(active);
        return FaqDto.from(faqRepository.save(faq));
    }

    @Transactional
    public void deleteFaq(Long id) {
        faqRepository.delete(findOrThrow(id));
    }

    private Faq findOrThrow(Long id) {
        return faqRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FAQ " + id + " not found"));
    }
}
