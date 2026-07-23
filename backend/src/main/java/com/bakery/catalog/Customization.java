package com.bakery.catalog;

import jakarta.persistence.Embeddable;
import lombok.*;

/** A single customization axis for a product, e.g. Milk / Sugar Level / Temperature. */
@Embeddable
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customization {

    private String name;

    /** Comma-separated list of options, e.g. "Whole,Oat,Almond,Skim". */
    private String optionsCsv;

    private boolean required;
}
