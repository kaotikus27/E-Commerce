package com.bakery.order;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only order operations for the Live Orders Kanban board. */
@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping
    public List<OrderResponseDto> listOrders() {
        return orderService.listAllOrders();
    }

    @PatchMapping("/{orderNumber}/status")
    public OrderResponseDto updateStatus(@PathVariable String orderNumber, @Valid @RequestBody UpdateOrderStatusRequest request) {
        return orderService.updateStatus(orderNumber, request.status(), request.cancelReason());
    }

    @PatchMapping("/{orderNumber}/mark-paid")
    public OrderResponseDto markPaid(@PathVariable String orderNumber) {
        return orderService.markPaid(orderNumber);
    }
}
