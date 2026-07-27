package com.bakery.order;

import com.bakery.catalog.Product;
import com.bakery.catalog.ProductRepository;
import com.bakery.store.StoreSettingsService;
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
    private final StoreSettingsService storeSettingsService;

    @Transactional
    public OrderResponseDto placeOrder(OrderRequestDto request) {
        if (!storeSettingsService.isAcceptingOrders()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Online ordering is currently closed.");
        }

        if (request.paymentMethod() == PaymentMethod.GCASH_MANUAL
                && (request.gcashReference() == null || request.gcashReference().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "GCash reference number is required for this payment method.");
        }

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .guestName(request.guestName())
                .guestPhone(request.guestPhone())
                .guestEmail(request.guestEmail())
                .pickupTime(request.pickupTime())
                .paymentMethod(request.paymentMethod())
                .paymentStatus(request.paymentMethod() == PaymentMethod.GCASH_MANUAL
                        ? PaymentStatus.PENDING_VERIFICATION : PaymentStatus.UNPAID)
                .status(OrderStatus.RECEIVED)
                .createdAt(Instant.now())
                .notes(request.notes())
                .gcashReference(request.paymentMethod() == PaymentMethod.GCASH_MANUAL ? request.gcashReference() : null)
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

    public List<OrderResponseDto> listAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream().map(OrderResponseDto::from).toList();
    }

    @Transactional
    public OrderResponseDto updateStatus(String orderNumber, OrderStatus status, String cancelReason) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        order.setStatus(status);
        order.setCancelReason(status == OrderStatus.CANCELLED ? cancelReason : null);
        // Cancelling an order that was still awaiting GCash verification means that payment
        // never checked out — reflect that in the payment state rather than leaving it stuck
        // at PENDING_VERIFICATION forever.
        if (status == OrderStatus.CANCELLED && order.getPaymentStatus() == PaymentStatus.PENDING_VERIFICATION) {
            order.setPaymentStatus(PaymentStatus.FAILED);
        }
        return OrderResponseDto.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponseDto markPaid(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        order.setPaymentStatus(PaymentStatus.PAID);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    /** Staff has cross-checked the GCash reference against their own app — verify payment and send it to the kitchen. */
    @Transactional
    public OrderResponseDto verifyAndAcceptPayment(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setStatus(OrderStatus.PREPARING);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    private String generateOrderNumber() {
        int suffix = ThreadLocalRandom.current().nextInt(100000, 999999);
        return "ORD-" + suffix;
    }
}
