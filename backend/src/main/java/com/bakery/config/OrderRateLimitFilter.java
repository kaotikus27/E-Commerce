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

/** Guest checkout (POST /api/v1/orders) is unauthenticated and, for GCash orders, triggers a
 *  CPU-bound Tesseract OCR pass on every submission — without a cap here, one source can tie up
 *  request threads by resubmitting indefinitely. Capped per client IP rather than globally, so it
 *  throttles an abusive source without limiting unrelated concurrent shoppers. In-memory bucket
 *  per IP is fine for this app's single-instance deployment; if this ever sits behind a reverse
 *  proxy or load balancer, getRemoteAddr() will see the proxy's IP for every request and this
 *  stops discriminating between clients unless it's updated to read a trusted forwarded-for header. */
@Component
public class OrderRateLimitFilter extends OncePerRequestFilter {

    private static final int CAPACITY = 5;
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(1);

    private final ConcurrentMap<String, Bucket> bucketsByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!isRateLimited(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Bucket bucket = bucketsByIp.computeIfAbsent(request.getRemoteAddr(), ip -> newBucket());
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"message\":\"Too many order submissions from this address — please wait a minute and try again.\"}");
    }

    private boolean isRateLimited(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && "/api/v1/orders".equals(request.getRequestURI());
    }

    private Bucket newBucket() {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(CAPACITY).refillGreedy(CAPACITY, REFILL_PERIOD))
                .build();
    }
}
