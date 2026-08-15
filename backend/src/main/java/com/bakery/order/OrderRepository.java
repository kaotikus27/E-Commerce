package com.bakery.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNumber(String orderNumber);

    /** Public/unauthenticated lookup path — see Order.publicToken. */
    Optional<Order> findByPublicToken(String publicToken);

    Optional<Order> findByLalamoveOrderId(String lalamoveOrderId);
    List<Order> findAllByOrderByCreatedAtDesc();

    boolean existsByOrderNumber(String orderNumber);

    /** A GCash transaction reference is single-use — reusing one across orders is the cheapest
     *  fraud available against a manual-verification payment rail. */
    boolean existsByGcashReference(String gcashReference);
}
