package com.bakery.delivery;

import com.bakery.store.StoreService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class DeliveryQuoteService {

    // Two results are only treated as genuinely ambiguous (worth asking the customer to pick)
    // when they're farther apart than this — natural geocoding jitter for a single real place is
    // well under 1km, while a name that exists in more than one barangay/city is typically many
    // km apart (today's real case: two different Muzons, ~15km apart).
    private static final double AMBIGUITY_THRESHOLD_KM = 1.5;

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
    public DeliveryQuoteResultDto requestQuote(String address, String serviceType,
                                                BigDecimal chosenLat, BigDecimal chosenLng, String chosenLabel) {
        GeocodeResult destination;
        if (chosenLat != null && chosenLng != null) {
            // An exact point was already chosen — either from a candidate the customer picked, or
            // a pin they dragged on the map. Skip forward-geocoding entirely; if the caller didn't
            // already know a label for this exact point (e.g. a freshly dropped pin), one reverse-
            // geocode call gets a clean display address for it.
            destination = (chosenLabel != null && !chosenLabel.isBlank())
                    ? new GeocodeResult(chosenLabel, chosenLat, chosenLng)
                    : geocodingService.reverseGeocode(chosenLat, chosenLng);
        } else {
            List<GeocodeResult> candidates = geocodingService.resolveCandidates(address);
            List<GeocodeResult> distinct = keepGenuinelyDistinct(candidates);
            if (distinct.size() > 1) {
                return DeliveryQuoteResultDto.ambiguous(distinct.stream().map(GeocodeCandidateDto::from).toList());
            }
            destination = distinct.get(0);
        }

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

        return DeliveryQuoteResultDto.resolved(DeliveryQuoteResponseDto.from(deliveryQuoteRepository.save(quote), googleMapsRouteUrl));
    }

    /** Keeps the top-ranked candidate plus any other candidate more than
     *  {@link #AMBIGUITY_THRESHOLD_KM} away from it — near-duplicate results for the same real
     *  place collapse down to just the first, so the customer is only asked to disambiguate when
     *  the candidates are actually different places. */
    private List<GeocodeResult> keepGenuinelyDistinct(List<GeocodeResult> candidates) {
        GeocodeResult best = candidates.get(0);
        List<GeocodeResult> distinct = new java.util.ArrayList<>();
        distinct.add(best);
        for (int i = 1; i < candidates.size(); i++) {
            GeocodeResult candidate = candidates.get(i);
            if (haversineKm(best.latitude(), best.longitude(), candidate.latitude(), candidate.longitude()) > AMBIGUITY_THRESHOLD_KM) {
                distinct.add(candidate);
            }
        }
        return distinct;
    }

    private double haversineKm(BigDecimal lat1, BigDecimal lng1, BigDecimal lat2, BigDecimal lng2) {
        final double earthRadiusKm = 6371;
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLng = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1.doubleValue())) * Math.cos(Math.toRadians(lat2.doubleValue()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
