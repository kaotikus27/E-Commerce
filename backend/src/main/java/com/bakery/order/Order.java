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

    /** Short, human-readable reference — read out to customers, printed on receipts, used in
     *  admin URLs. Deliberately guessable, so it must NEVER be the key to a permitAll lookup. */
    @Column(unique = true, nullable = false)
    private String orderNumber;

    /** Unguessable public tracking id (UUIDv4). This is the only key the unauthenticated
     *  order-status endpoint accepts, so that the short human-readable orderNumber is never
     *  usable as a public lookup key. */
    // H2's schema-update path rebuilds the table when adding this non-null column. The default
    // gives historical rows an unguessable token during that copy; new rows provide their UUID.
    @Column(unique = true, nullable = false, updatable = false, length = 36,
            columnDefinition = "varchar(36) default random_uuid()")
    private String publicToken;

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

    /** The geocoded pinpoint search text (subdivision/landmark/barangay/city) — kept separate
     *  from deliveryUnitDetails so imprecise PH lot/block addressing doesn't have to fight the
     *  geocoder; the fee only needs subdivision-level accuracy. */
    private String deliveryAddress;
    // Explicit precision/scale — an unannotated BigDecimal column defaults to scale 2 in
    // Hibernate, rounding GPS coordinates to ~1km precision (see StoreSettings for the bug this
    // caused in practice).
    @Column(precision = 11, scale = 8)
    private BigDecimal deliveryLatitude;
    @Column(precision = 11, scale = 8)
    private BigDecimal deliveryLongitude;

    /** Human-readable rider instructions (Block/Lot/Phase/Gate/landmark) — never geocoded, just
     *  carried through for whoever physically delivers the order. */
    private String deliveryUnitDetails;

    /** Lalamove's quotation id, stored as String — PH order/quotation ids are up to 19 digits. */
    private String lalamoveQuotationId;
    private BigDecimal deliveryFee;

    /** Set once an admin dispatches a rider (Phase 2) — distinct from lalamoveQuotationId, which
     *  is the Phase 1 checkout-time quote and never becomes a real Lalamove order on its own. */
    private String lalamoveOrderId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeliveryStatus deliveryStatus = DeliveryStatus.NOT_DISPATCHED;

    private String driverName;
    private String driverPhone;
    private String driverPlateNumber;
    private String trackingShareLink;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();
}
