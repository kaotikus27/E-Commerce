package com.bakery.order;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderNumber;

    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private String pickupTime;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal total;

    private Instant createdAt;

    private String cancelReason;

    @Column(length = 150)
    private String notes;

    /** Customer-supplied GCash transaction reference number, set only for GCASH_MANUAL orders. */
    private String gcashReference;

    /** Path to the uploaded GCash receipt screenshot (e.g. "/uploads/receipts/<uuid>.png"), served statically. */
    private String receiptImagePath;

    /** Raw reference number Tess4J read off the receipt image, kept separate from gcashReference for admin cross-check. */
    private String ocrExtractedRef;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FulfillmentType fulfillmentType = FulfillmentType.PICKUP;

    private String deliveryAddress;
    private BigDecimal deliveryLatitude;
    private BigDecimal deliveryLongitude;

    /** Lalamove's quotation id, stored as String — PH order/quotation ids are up to 19 digits. */
    private String lalamoveQuotationId;
    private BigDecimal deliveryFee;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();
}
