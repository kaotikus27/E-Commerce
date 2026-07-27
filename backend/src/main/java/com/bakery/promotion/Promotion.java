package com.bakery.promotion;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "promotions")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 500)
    private String description;

    private String buttonLabel;

    private String buttonLink;

    private boolean active;

    @Builder.Default
    private int sortOrder = 0;
}
