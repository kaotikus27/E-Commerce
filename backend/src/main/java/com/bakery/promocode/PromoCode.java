package com.bakery.promocode;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "promo_codes")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromoCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Always stored uppercase — lookups normalize the same way, so "chill10" and "CHILL10" are
     *  the same code from the customer's perspective. */
    @Column(nullable = false, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DiscountType discountType;

    /** For PERCENT, a 0-100 value (e.g. 10 = 10% off). For FIXED, a peso amount. */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    private boolean active;
}
