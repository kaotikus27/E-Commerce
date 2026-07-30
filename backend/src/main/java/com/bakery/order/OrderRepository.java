package com.bakery.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByLalamoveOrderId(String lalamoveOrderId);
    List<Order> findAllByOrderByCreatedAtDesc();
}
