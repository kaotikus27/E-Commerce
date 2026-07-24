package com.bakery.store;

import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record DayScheduleDto(
        @NotNull DayOfWeek dayOfWeek,
        LocalTime openTime,
        LocalTime closeTime,
        boolean closedAllDay
) {
    public static DayScheduleDto from(DaySchedule d) {
        return new DayScheduleDto(d.getDayOfWeek(), d.getOpenTime(), d.getCloseTime(), d.isClosedAllDay());
    }

    public DaySchedule toEntity() {
        return DaySchedule.builder()
                .dayOfWeek(dayOfWeek())
                .openTime(openTime())
                .closeTime(closeTime())
                .closedAllDay(closedAllDay())
                .build();
    }
}
