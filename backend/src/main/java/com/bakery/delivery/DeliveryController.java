package com.bakery.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Public endpoints for getting a delivery fee quote at checkout — quotation only, no dispatch. */
@RestController
@RequestMapping("/api/v1/delivery")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryQuoteService deliveryQuoteService;
    private final LalamoveClient lalamoveClient;

    @PostMapping("/quote")
    public DeliveryQuoteResultDto getQuote(@Valid @RequestBody DeliveryQuoteRequestDto request) {
        return deliveryQuoteService.requestQuote(request.address(), request.serviceType(),
                request.latitude(), request.longitude(), request.resolvedLabel());
    }

    /** Raw passthrough of Lalamove's city capabilities — deliberately not reshaped into our own DTO
     *  so the frontend can read whatever serviceType/specialRequests values are actually valid for
     *  this market, instead of us hardcoding values that may not exist here. */
    @GetMapping("/service-types")
    public JsonNode getServiceTypes() {
        return lalamoveClient.getCityCapabilities();
    }
}
