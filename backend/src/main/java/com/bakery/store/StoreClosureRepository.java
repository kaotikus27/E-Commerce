package com.bakery.store;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface StoreClosureRepository extends JpaRepository<StoreClosure, Long> {
    boolean existsByDate(LocalDate date);
    List<StoreClosure> findAllByOrderByDateAsc();
}
