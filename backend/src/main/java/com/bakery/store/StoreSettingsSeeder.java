package com.bakery.store;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/** Seeds StoreSettings (id=1) from the bakery's real hours on first boot: Tue-Sun 5PM-midnight, Monday closed. */
@Component
@RequiredArgsConstructor
public class StoreSettingsSeeder implements CommandLineRunner {

    private final StoreSettingsRepository storeSettingsRepository;

    @Override
    public void run(String... args) {
        if (storeSettingsRepository.existsById(1L)) return;

        List<DaySchedule> schedule = List.of(
                DaySchedule.builder().dayOfWeek(DayOfWeek.MONDAY).closedAllDay(true).build(),
                openDay(DayOfWeek.TUESDAY),
                openDay(DayOfWeek.WEDNESDAY),
                openDay(DayOfWeek.THURSDAY),
                openDay(DayOfWeek.FRIDAY),
                openDay(DayOfWeek.SATURDAY),
                openDay(DayOfWeek.SUNDAY)
        );

        StoreSettings settings = StoreSettings.builder()
                .id(1L)
                .emergencyPause(false)
                .schedule(new java.util.ArrayList<>(schedule))
                .orderLeadTimeMinutes(15)
                .stopOrderingBeforeCloseMinutes(0)
                .build();

        storeSettingsRepository.save(settings);
    }

    private DaySchedule openDay(DayOfWeek day) {
        return DaySchedule.builder()
                .dayOfWeek(day)
                .openTime(LocalTime.of(17, 0))
                .closeTime(null) // open through midnight
                .closedAllDay(false)
                .build();
    }
}
