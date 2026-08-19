package com.bakery.config;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/** Two unauthenticated endpoints get capped per client IP here, with independent budgets since
 *  they're different abuse surfaces:
 *  - POST /api/v1/orders (guest checkout) triggers a CPU-bound Tesseract OCR pass on every GCash
 *    submission — without a cap, one source can tie up request threads by resubmitting
 *    indefinitely.
 *  - POST /api/v1/orders/lookup (order-number + phone lookup, see OrderService.lookupOrder) has
 *    no compute cost gate at all, so it's a pure guessing/enumeration surface and gets a
 *    tighter budget.
 *  Bucket keys include the request path (not just the IP) so exhausting one endpoint's quota
 *  never blocks the other — e.g. a guest who just placed an order can still immediately look it
 *  up. In-memory buckets are fine for this app's single-instance deployment; if this ever sits
 *  behind a reverse proxy or load balancer, getRemoteAddr() will see the proxy's IP for every
 *  request and this stops discriminating between clients unless it's updated to read a trusted
 *  forwarded-for header. */
@Component
public class OrderRateLimitFilter extends OncePerRequestFilter {

    private static final String ORDERS_PATH = "/api/v1/orders";
    private static final String LOOKUP_PATH = "/api/v1/orders/lookup";

    private static final int ORDERS_CAPACITY = 5;
    private static final Duration ORDERS_REFILL_PERIOD = Duration.ofMinutes(1);

    private static final int LOOKUP_CAPACITY = 5;
    private static final Duration LOOKUP_REFILL_PERIOD = Duration.ofMinutes(5);

    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        boolean isLookup = LOOKUP_PATH.equals(path);
        if (!isLookup && !ORDERS_PATH.equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String bucketKey = request.getRemoteAddr() + "|" + path;
        Bucket bucket = buckets.computeIfAbsent(bucketKey, key -> isLookup ? newLookupBucket() : newOrdersBucket());
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"message\":\"Too many requests from this address — please wait a minute and try again.\"}");
    }

    private Bucket newOrdersBucket() {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(ORDERS_CAPACITY).refillGreedy(ORDERS_CAPACITY, ORDERS_REFILL_PERIOD))
                .build();
    }

    private Bucket newLookupBucket() {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(LOOKUP_CAPACITY).refillGreedy(LOOKUP_CAPACITY, LOOKUP_REFILL_PERIOD))
                .build();
    }
}
