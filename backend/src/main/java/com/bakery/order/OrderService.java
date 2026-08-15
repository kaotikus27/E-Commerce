package com.bakery.order;

import com.bakery.catalog.Product;
import com.bakery.catalog.ProductRepository;
import com.bakery.delivery.DeliveryDispatchService;
import com.bakery.delivery.DeliveryQuote;
import com.bakery.delivery.DeliveryQuoteService;
import com.bakery.delivery.LalamoveClient;
import com.bakery.delivery.LalamoveDriver;
import com.bakery.delivery.LalamoveOrderStatus;
import com.bakery.store.StoreSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.0875");
    private static final int ORDER_NUMBER_MAX_ATTEMPTS = 10;
    private static final Path RECEIPT_UPLOAD_DIR = Path.of("uploads", "receipts");
    private static final Map<String, String> ALLOWED_RECEIPT_CONTENT_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp"
    );

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreSettingsService storeSettingsService;
    private final GCashOcrService gcashOcrService;
    private final DeliveryQuoteService deliveryQuoteService;
    private final DeliveryDispatchService deliveryDispatchService;
    private final LalamoveClient lalamoveClient;

    @Transactional
    public OrderResponseDto placeOrder(OrderRequestDto request, MultipartFile receiptImage) {
        if (!storeSettingsService.isAcceptingOrders()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Online ordering is currently closed.");
        }

        boolean isGcash = request.paymentMethod() == PaymentMethod.GCASH_MANUAL;
        if (isGcash && (receiptImage == null || receiptImage.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "GCash payment receipt image is required.");
        }

        FulfillmentType fulfillmentType = request.fulfillmentType() != null ? request.fulfillmentType() : FulfillmentType.PICKUP;

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .publicToken(UUID.randomUUID().toString())
                .guestName(request.guestName())
                .guestPhone(request.guestPhone())
                .guestEmail(request.guestEmail())
                .pickupTime(request.pickupTime())
                .paymentMethod(request.paymentMethod())
                .paymentStatus(isGcash ? PaymentStatus.PENDING_VERIFICATION : PaymentStatus.UNPAID)
                .status(OrderStatus.RECEIVED)
                .createdAt(Instant.now())
                .notes(request.notes())
                .fulfillmentType(fulfillmentType)
                .build();

        if (isGcash) {
            applyReceiptImage(order, receiptImage);
        }

        BigDecimal deliveryFee = BigDecimal.ZERO;
        if (fulfillmentType == FulfillmentType.DELIVERY) {
            DeliveryQuote quote = deliveryQuoteService.validateAndConsume(request.deliveryQuotationId());
            order.setDeliveryAddress(quote.getDestinationAddress());
            order.setDeliveryLatitude(quote.getLatitude());
            order.setDeliveryLongitude(quote.getLongitude());
            order.setLalamoveQuotationId(quote.getQuotationId());
            deliveryFee = quote.getFeeTotal();
            order.setDeliveryFee(deliveryFee);
            order.setDeliveryUnitDetails(request.deliveryUnitDetails());
        }

        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequestDto itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Product " + itemReq.productId() + " does not exist"));

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .productId(product.getId())
                    .productName(product.getName())
                    .unitPrice(product.getPrice())
                    .quantity(itemReq.quantity())
                    .selectedOptionsCsv(OrderOptionCodec.encode(itemReq.selectedOptions()))
                    .lineTotal(lineTotal)
                    .build();

            order.getItems().add(item);
        }

        BigDecimal tax = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax).add(deliveryFee).setScale(2, RoundingMode.HALF_UP);

        order.setSubtotal(subtotal);
        order.setTax(tax);
        order.setTotal(total);

        Order saved = orderRepository.save(order);
        return OrderResponseDto.from(saved);
    }

    public OrderResponseDto getOrderStatus(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        return OrderResponseDto.from(order);
    }

    public List<OrderResponseDto> listAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream().map(OrderResponseDto::from).toList();
    }

    @Transactional
    public OrderResponseDto updateStatus(String orderNumber, OrderStatus status, String cancelReason) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        order.setStatus(status);
        order.setCancelReason(status == OrderStatus.CANCELLED ? cancelReason : null);
        // Cancelling an order that was still awaiting GCash verification means that payment
        // never checked out — reflect that in the payment state rather than leaving it stuck
        // at PENDING_VERIFICATION forever.
        if (status == OrderStatus.CANCELLED && order.getPaymentStatus() == PaymentStatus.PENDING_VERIFICATION) {
            order.setPaymentStatus(PaymentStatus.FAILED);
        }
        return OrderResponseDto.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponseDto markPaid(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        order.setPaymentStatus(PaymentStatus.PAID);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    /** Staff has cross-checked the GCash reference against their own app — verify payment and send it to the kitchen.
     *  confirmedReference, if provided, overwrites gcashReference with what the admin actually verified
     *  (e.g. a typo they corrected), so the stored record reflects the confirmed transaction, not the customer's entry. */
    @Transactional
    public OrderResponseDto verifyAndAcceptPayment(String orderNumber, String confirmedReference) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        if (confirmedReference != null && !confirmedReference.isBlank()) {
            order.setGcashReference(confirmedReference);
        }
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setStatus(OrderStatus.PREPARING);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    /** Admin clicks "Call Lalamove Rider" — places a real Lalamove order (Phase 2) against an
     *  already-paid delivery order. Fresh-quotes at dispatch time; see DeliveryDispatchService. */
    @Transactional
    public OrderResponseDto dispatchDelivery(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        deliveryDispatchService.dispatch(order);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    /** Manual fallback for when Lalamove's webhook never arrives (e.g. no public tunnel reaches
     *  this machine in dev, or a real delivery event over the internet). Pulls the current status
     *  straight from Lalamove instead of waiting on a push, then funnels it through the exact same
     *  guarded applyDeliveryWebhookUpdate() path the webhook uses — so an out-of-order or stale
     *  pull can't regress an order any more than a stale webhook event could. Driver name/phone/
     *  plate are only backfilled once (when we don't have them yet) — reassignment mid-flight is
     *  expected to still arrive via the webhook when reachable, not repeatedly re-pulled here. */
    @Transactional
    public OrderResponseDto syncDeliveryStatus(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        String lalamoveOrderId = order.getLalamoveOrderId();
        if (lalamoveOrderId == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order hasn't been dispatched to Lalamove yet.");
        }

        LalamoveOrderStatus lalamoveOrder = lalamoveClient.getOrder(lalamoveOrderId);
        DeliveryStatus status = DeliveryStatus.fromLalamove(lalamoveOrder.status());

        String driverName = null;
        String driverPhone = null;
        String driverPlateNumber = null;
        if (lalamoveOrder.driverId() != null && !lalamoveOrder.driverId().isBlank()
                && order.getDriverName() == null) {
            LalamoveDriver driver = lalamoveClient.getDriver(lalamoveOrderId, lalamoveOrder.driverId());
            driverName = driver.name();
            driverPhone = driver.phone();
            driverPlateNumber = driver.plateNumber();
        }

        applyDeliveryWebhookUpdate(lalamoveOrderId, status, driverName, driverPhone, driverPlateNumber, lalamoveOrder.shareLink());

        return OrderResponseDto.from(orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found")));
    }

    /** Linear happy-path progression for DeliveryStatus — REJECTED/CANCELED are deliberately
     *  excluded, they're terminal exits reachable from any point, not a rank in this sequence. */
    private static final List<DeliveryStatus> DELIVERY_PROGRESSION = List.of(
            DeliveryStatus.NOT_DISPATCHED, DeliveryStatus.ASSIGNING_DRIVER,
            DeliveryStatus.ON_GOING, DeliveryStatus.PICKED_UP, DeliveryStatus.COMPLETED);

    private static boolean isTerminalDeliveryStatus(DeliveryStatus status) {
        return status == DeliveryStatus.COMPLETED || status == DeliveryStatus.REJECTED || status == DeliveryStatus.CANCELED;
    }

    /** Two independent paths can write deliveryStatus (webhook push, manual/poll pull) with no
     *  guarantee either arrives in chronological order — a stale response landing after a newer
     *  one would otherwise silently regress the order. REJECTED/CANCELED always win since they're
     *  terminal exits, not a further step in the happy-path sequence. */
    private static boolean shouldApplyDeliveryStatus(DeliveryStatus current, DeliveryStatus incoming) {
        if (incoming == null) return false;
        if (current == null) return true;
        if (incoming == DeliveryStatus.REJECTED || incoming == DeliveryStatus.CANCELED) return true;
        int currentRank = DELIVERY_PROGRESSION.indexOf(current);
        int incomingRank = DELIVERY_PROGRESSION.indexOf(incoming);
        if (currentRank < 0 || incomingRank < 0) return true;
        return incomingRank >= currentRank;
    }

    /** Applies a Lalamove delivery update (from either the webhook push or a manual/poll pull) to
     *  whichever order matches lalamoveOrderId — silently a no-op if no match (unknown/stale/
     *  duplicate event), since a webhook receiver should never 500 back to the sender over
     *  something it can't do anything about. Once an order is terminal (COMPLETED/REJECTED/
     *  CANCELED), every further update is ignored outright — a late-arriving out-of-order event
     *  (driver info included) should never reopen or overwrite a finished order. */
    @Transactional
    public void applyDeliveryWebhookUpdate(String lalamoveOrderId, DeliveryStatus newStatus,
                                            String driverName, String driverPhone, String driverPlateNumber,
                                            String shareLink) {
        orderRepository.findByLalamoveOrderId(lalamoveOrderId).ifPresent(order -> {
            DeliveryStatus current = order.getDeliveryStatus();
            if (isTerminalDeliveryStatus(current) && newStatus != current) {
                System.err.println("[Lalamove delivery update] Ignoring update for lalamoveOrderId=" + lalamoveOrderId
                        + " — order already terminal (" + current + "); incoming status " + newStatus);
                return;
            }

            if (newStatus != null) {
                if (shouldApplyDeliveryStatus(current, newStatus)) {
                    order.setDeliveryStatus(newStatus);
                } else {
                    System.err.println("[Lalamove delivery update] Ignoring out-of-order status " + newStatus
                            + " for lalamoveOrderId=" + lalamoveOrderId + " — current status " + current + " is already further along.");
                }
            }
            if (driverName != null) order.setDriverName(driverName);
            if (driverPhone != null) order.setDriverPhone(driverPhone);
            if (driverPlateNumber != null) order.setDriverPlateNumber(driverPlateNumber);
            if (shareLink != null) order.setTrackingShareLink(shareLink);
            orderRepository.save(order);
        });
    }

    /** Admin manually attaches/replaces a receipt screenshot during verification — e.g. the
     *  customer sent proof through another channel, or the original upload was unreadable. */
    @Transactional
    public OrderResponseDto uploadReceiptForVerification(String orderNumber, MultipartFile receiptImage) {
        if (receiptImage == null || receiptImage.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt image is required.");
        }
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order " + orderNumber + " not found"));
        applyReceiptImage(order, receiptImage);
        return OrderResponseDto.from(orderRepository.save(order));
    }

    /** orderNumber is a short human-readable reference on a unique column. Generating it randomly
     *  with no collision check meant a ~50% chance of at least one clash by roughly 1,100 orders,
     *  surfacing as an unhandled constraint violation — a 500 on an ALREADY-PAID checkout, after
     *  the delivery quote had been consumed and the receipt file written. Retry on collision, and
     *  fail loudly rather than silently if the space is somehow exhausted.
     *  (Note the old upper bound was exclusive, so 999999 was never issued.) */
    private String generateOrderNumber() {
        for (int attempt = 0; attempt < ORDER_NUMBER_MAX_ATTEMPTS; attempt++) {
            String candidate = "ORD-" + ThreadLocalRandom.current().nextInt(100_000, 1_000_000);
            if (!orderRepository.existsByOrderNumber(candidate)) {
                return candidate;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Could not allocate an order number. Please try again.");
    }

    /** Runs OCR, stores the image, and records both — only seeds gcashReference from OCR if it's
     *  not already set, so a re-upload during admin verification doesn't clobber an admin's
     *  already-confirmed/corrected reference. */
    private void applyReceiptImage(Order order, MultipartFile receiptImage) {
        String ocrRef = extractReference(receiptImage);
        order.setReceiptImagePath(storeReceiptImage(receiptImage));
        order.setOcrExtractedRef(ocrRef);
        if (order.getGcashReference() == null || order.getGcashReference().isBlank()) {
            order.setGcashReference(ocrRef);
        }
    }

    private String extractReference(MultipartFile receiptImage) {
        try (var imageStream = receiptImage.getInputStream()) {
            return gcashOcrService.extractReferenceNumber(imageStream);
        } catch (IOException e) {
            return null;
        }
    }

    private String storeReceiptImage(MultipartFile receiptImage) {
        String extension = ALLOWED_RECEIPT_CONTENT_TYPES.get(receiptImage.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported receipt image type. Allowed: " + List.copyOf(ALLOWED_RECEIPT_CONTENT_TYPES.keySet()));
        }

        String filename = UUID.randomUUID() + "." + extension;
        try {
            Files.createDirectories(RECEIPT_UPLOAD_DIR);
            receiptImage.transferTo(RECEIPT_UPLOAD_DIR.resolve(filename));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store receipt image", e);
        }

        return "/uploads/receipts/" + filename;
    }
}
