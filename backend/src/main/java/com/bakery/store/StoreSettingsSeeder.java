package com.bakery.store;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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
                // Coordinates confirmed against the store's own Google Maps place link
                // (google.com/maps/place/Home+Cafe+by+Bami/@14.798018,121.0140762,13z/...!3d14.8690823!4d121.0430113...).
                // storeAddress stays a full postal address (not just the place name) — this field
                // is shown to customers verbatim (footer, location banner, order-status page) and
                // sent to Lalamove as the pickup address text, so a bare business name loses the
                // street-level detail riders and customers actually need. An admin can update this
                // later from Store Settings, which re-geocodes automatically.
                .storeAddress("048 Kay Piskal Rd, Tigbe, Norzagaray, 3013 Bulacan, Philippines")
                .storeLatitude(new BigDecimal("14.8690823"))
                .storeLongitude(new BigDecimal("121.0430113"))
                .build();

        storeSettingsRepository.save(settings);
    }

    private DaySchedule openDay(DayOfWeek day) {
        return DaySchedule.builder()
                .dayOfWeek(day)
                .openTime(LocalTime.of(10, 0))
                .closeTime(null) // open through midnight
                .closedAllDay(false)
                .build();
    }
}
