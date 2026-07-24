package com.bakery.store;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** A one-off closure (holiday, staff day off) independent of the weekly schedule. */
@Entity
@Table(name = "store_closures")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreClosure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate date;

    private String reason;
}
