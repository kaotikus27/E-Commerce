package com.bakery.order;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderRequestDto(
        String guestName,
        String guestPhone,
        @Email String guestEmail,
        @NotNull String pickupTime,
        @NotNull PaymentMethod paymentMethod,
        @NotEmpty List<OrderItemRequestDto> items,
        @Size(max = 150) String notes,
        FulfillmentType fulfillmentType,
        /** Required when fulfillmentType is DELIVERY — identifies the server-side DeliveryQuote to consume. */
        String deliveryQuotationId,
        /** Block/Lot/Phase/Gate/landmark rider instructions — plain text, never geocoded, so no
         *  quote/integrity handling needed (unlike deliveryAddress/fee, which come from the quote). */
        String deliveryUnitDetails
) {
}
