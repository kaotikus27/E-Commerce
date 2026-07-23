package com.bakery.order;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponseDto> placeOrder(@Valid @RequestBody OrderRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(request));
    }

    @GetMapping("/{orderNumber}")
    public OrderResponseDto getOrder(@PathVariable String orderNumber) {
        return orderService.getOrderStatus(orderNumber);
    }

    @PatchMapping("/{orderNumber}/status")
    public OrderResponseDto updateStatus(@PathVariable String orderNumber, @RequestParam OrderStatus status) {
        return orderService.updateStatus(orderNumber, status);
    }
}
