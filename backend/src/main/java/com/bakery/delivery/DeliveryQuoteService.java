package com.bakery.delivery;

import com.bakery.store.StoreService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;

@Service
public class DeliveryQuoteService {

    private final GeocodingService geocodingService;
    private final LalamoveClient lalamoveClient;
    private final DeliveryQuoteRepository deliveryQuoteRepository;
    private final StoreService storeService;
    private final String defaultServiceType;

    public DeliveryQuoteService(GeocodingService geocodingService,
                                LalamoveClient lalamoveClient,
                                DeliveryQuoteRepository deliveryQuoteRepository,
                                StoreService storeService,
                                @Value("${lalamove.default-service-type}") String defaultServiceType) {
        this.geocodingService = geocodingService;
        this.lalamoveClient = lalamoveClient;
        this.deliveryQuoteRepository = deliveryQuoteRepository;
        this.storeService = storeService;
        this.defaultServiceType = defaultServiceType;
    }

    @Transactional
    public DeliveryQuoteResponseDto requestQuote(String address, String serviceType) {
        GeocodeResult destination = geocodingService.resolveAddressOrMapsUrl(address);
        String resolvedServiceType = (serviceType == null || serviceType.isBlank()) ? defaultServiceType : serviceType;

        LalamoveQuotation quotation = lalamoveClient.getQuotation(
                storeService.getLatitude(), storeService.getLongitude(), storeService.getAddress(),
                destination.latitude(), destination.longitude(), destination.formattedAddress(),
                resolvedServiceType
        );

        DeliveryQuote quote = DeliveryQuote.builder()
                .quotationId(quotation.quotationId())
                .originAddress(storeService.getAddress())
                .destinationAddress(destination.formattedAddress())
                .latitude(destination.latitude())
                .longitude(destination.longitude())
                .feeTotal(quotation.feeTotal())
                .serviceType(resolvedServiceType)
                .expiresAt(quotation.expiresAt())
                .build();

        String googleMapsRouteUrl = buildGoogleMapsRouteUrl(
                storeService.getLatitude(), storeService.getLongitude(),
                destination.latitude(), destination.longitude()
        );

        return DeliveryQuoteResponseDto.from(deliveryQuoteRepository.save(quote), googleMapsRouteUrl);
    }

    /** Plain, keyless Google Maps directions deep link — driving mode approximates a motorcycle
     *  rider's real road route far better than bicycling mode, which avoids roads bikes can't use. */
    private String buildGoogleMapsRouteUrl(BigDecimal originLat, BigDecimal originLng,
                                            BigDecimal destLat, BigDecimal destLng) {
        return "https://www.google.com/maps/dir/?api=1&origin=" + originLat.toPlainString() + "," + originLng.toPlainString()
                + "&destination=" + destLat.toPlainString() + "," + destLng.toPlainString()
                + "&travelmode=driving";
    }

    /** Looks up a quote by id and marks it consumed — a quote is single-use, matching Lalamove's
     *  one-order-per-quotation model, and expired quotes are rejected rather than silently reused. */
    @Transactional
    public DeliveryQuote validateAndConsume(String quotationId) {
        if (quotationId == null || quotationId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A delivery quote is required for delivery orders.");
        }

        DeliveryQuote quote = deliveryQuoteRepository.findById(quotationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery quote not found — please get a new quote."));

        if (quote.isConsumed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This delivery quote has already been used — please get a new quote.");
        }
        if (Instant.now().isAfter(quote.getExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery quote expired, please refresh the fee and try again.");
        }

        quote.setConsumed(true);
        return deliveryQuoteRepository.save(quote);
    }
}
