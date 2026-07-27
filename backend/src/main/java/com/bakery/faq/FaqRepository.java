package com.bakery.faq;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRepository extends JpaRepository<Faq, Long> {
    List<Faq> findByActiveTrueOrderBySortOrderAsc();
    List<Faq> findAllByOrderBySortOrderAsc();
}
