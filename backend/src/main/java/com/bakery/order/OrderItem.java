package com.bakery.order;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private int quantity;

    /** Serialized as "Milk:Oat;Sugar Level:Regular" for simplicity. */
    private String selectedOptionsCsv;

    private BigDecimal lineTotal;
}
