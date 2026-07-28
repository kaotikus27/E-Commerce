package com.bakery.delivery;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/** A single-use, server-cached record of a Lalamove quotation — placeOrder() looks up the fee here
 *  by quotationId instead of trusting a client-supplied number, and this is what lets us reject an
 *  expired or already-used quote at order-placement time. */
@Entity
@Table(name = "delivery_quotes")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryQuote {

    @Id
    private String quotationId;

    private String originAddress;
    private String destinationAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal feeTotal;
    private String serviceType;
    private Instant expiresAt;

    @Builder.Default
    private boolean consumed = false;
}
