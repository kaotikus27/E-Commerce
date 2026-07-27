package com.bakery.faq;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "faqs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String question;

    @Column(nullable = false, length = 2000)
    private String answer;

    private boolean active;

    @Builder.Default
    private int sortOrder = 0;
}
