package com.bakery.store;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalTime;

/** One weekday's online-ordering window. A null closeTime means "open through midnight". */
@Embeddable
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DaySchedule {

    @Enumerated(EnumType.STRING)
    private DayOfWeek dayOfWeek;

    private LocalTime openTime;
    private LocalTime closeTime;
    private boolean closedAllDay;
}
