package com.bakery.order;

import java.math.BigDecimal;
import java.util.Map;

public record OrderItemResponseDto(
        Long productId,
        String productName,
        int quantity,
        Map<String, String> selectedOptions,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
    public static OrderItemResponseDto from(OrderItem item) {
        Map<String, String> options = OrderOptionCodec.decode(item.getSelectedOptionsCsv());
        return new OrderItemResponseDto(
                item.getProductId(), item.getProductName(), item.getQuantity(),
                options, item.getUnitPrice(), item.getLineTotal()
        );
    }
}
