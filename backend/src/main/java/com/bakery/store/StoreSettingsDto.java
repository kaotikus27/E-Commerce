package com.bakery.store;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record StoreSettingsDto(
        boolean emergencyPause,
        @NotEmpty List<@Valid DayScheduleDto> schedule,
        @Min(0) int orderLeadTimeMinutes,
        @Min(0) int stopOrderingBeforeCloseMinutes
) {
    public static StoreSettingsDto from(StoreSettings s) {
        return new StoreSettingsDto(
                s.isEmergencyPause(),
                s.getSchedule().stream().map(DayScheduleDto::from).toList(),
                s.getOrderLeadTimeMinutes(),
                s.getStopOrderingBeforeCloseMinutes()
        );
    }
}
