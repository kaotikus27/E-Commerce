package com.bakery.order;

import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(@NotNull OrderStatus status, String cancelReason) {
}
