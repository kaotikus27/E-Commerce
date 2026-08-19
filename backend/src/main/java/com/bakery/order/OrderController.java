package com.bakery.order;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OrderResponseDto> placeOrder(
            @Valid @RequestPart("orderData") OrderRequestDto request,
            @RequestPart(value = "receiptImage", required = false) MultipartFile receiptImage) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(request, receiptImage));
    }

    @GetMapping("/{publicToken}")
    public OrderResponseDto getOrder(@PathVariable String publicToken) {
        return orderService.getOrderStatus(publicToken);
    }

    @PostMapping("/lookup")
    public OrderResponseDto lookupOrder(@Valid @RequestBody OrderLookupRequestDto request) {
        return orderService.lookupOrder(request);
    }
}
