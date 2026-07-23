package com.bakery.order;

import com.bakery.catalog.Product;
import com.bakery.catalog.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.0875");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderResponseDto placeOrder(OrderRequestDto request) {
        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .guestName(request.guestName())
                .guestPhone(request.guestPhone())
                .pickupTime(request.pickupTime())
                .paymentMethod(request.paymentMethod())
                .status(OrderStatus.RECEIVED)
                .createdAt(Instant.now())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequestDto itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Product " + itemReq.productId() + " does not exist"));

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .productId(product.getId())
                    .productName(product.getName())
                    .unitPrice(product.getPrice())
                    .quantity(itemReq.quantity())
                    .selectedOptionsCsv(OrderOptionCodec.encode(itemReq.selectedOptions()))
                    .lineTotal(lineTotal)
                    .build();

            order.getItems().add(item);
        }

        BigDecimal tax = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

        order.setSubtotal(subtotal);
        order.setTax(tax);
        order.setTotal(total);

        Order saved = orderRepository.save(order);
        return OrderResponseDto.from(saved);
    }

    public OrderResponseDto getOrderStatus(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        return OrderResponseDto.from(order);
    }

    @Transactional
    public OrderResponseDto updateStatus(String orderNumber, OrderStatus status) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        order.setStatus(status);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    private String generateOrderNumber() {
        int suffix = ThreadLocalRandom.current().nextInt(100000, 999999);
        return "ORD-" + suffix;
    }
}
