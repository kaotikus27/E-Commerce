package com.bakery.catalog;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    private String image;

    /** Comma-separated badges, e.g. "New,10% OFF". */
    private String badgesCsv;

    private double rating;

    private boolean available;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "product_customizations", joinColumns = @JoinColumn(name = "product_id"))
    private List<Customization> customizations = new ArrayList<>();
}
