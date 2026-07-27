package com.bakery.order;

import com.bakery.catalog.Product;
import com.bakery.catalog.ProductRepository;
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

    @Transactional
    public OrderResponseDto placeOrder(OrderRequestDto request, MultipartFile receiptImage) {
        if (!storeSettingsService.isAcceptingOrders()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Online ordering is currently closed.");
        }

        boolean isGcash = request.paymentMethod() == PaymentMethod.GCASH_MANUAL;
        if (isGcash && (receiptImage == null || receiptImage.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "GCash payment receipt image is required.");
        }

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .guestName(request.guestName())
                .guestPhone(request.guestPhone())
                .guestEmail(request.guestEmail())
                .pickupTime(request.pickupTime())
                .paymentMethod(request.paymentMethod())
                .paymentStatus(isGcash ? PaymentStatus.PENDING_VERIFICATION : PaymentStatus.UNPAID)
                .status(OrderStatus.RECEIVED)
                .createdAt(Instant.now())
                .notes(request.notes())
                .build();

        if (isGcash) {
            String ocrRef = extractReference(receiptImage);
            order.setReceiptImagePath(storeReceiptImage(receiptImage));
            order.setOcrExtractedRef(ocrRef);
            String typedRef = request.gcashReference();
            order.setGcashReference(typedRef != null && !typedRef.isBlank() ? typedRef : ocrRef);
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
        BigDecimal total = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

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

    private String generateOrderNumber() {
        int suffix = ThreadLocalRandom.current().nextInt(100000, 999999);
        return "ORD-" + suffix;
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
