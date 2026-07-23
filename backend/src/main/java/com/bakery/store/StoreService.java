package com.bakery.store;

import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;

@Service
public class StoreService {

    private static final String NAME = "Sage & Cream Bakehouse";
    private static final String ADDRESS = "221 Maple Street, Riverside Commons";
    private static final String PHONE = "(555) 213-4477";
    private static final String MAP_URL = "https://maps.google.com/?q=Sage+and+Cream+Bakehouse";

    public StoreInfoDto getStoreInfo() {
        ZonedDateTime now = ZonedDateTime.now();
        boolean weekend = now.getDayOfWeek() == DayOfWeek.SATURDAY || now.getDayOfWeek() == DayOfWeek.SUNDAY;

        LocalTime openTime = LocalTime.of(weekend ? 8 : 7, 0);
        LocalTime closeTime = LocalTime.of(weekend ? 16 : 18, 0);
        LocalTime nowTime = now.toLocalTime();
        boolean isOpen = !nowTime.isBefore(openTime) && nowTime.isBefore(closeTime);

        String todayHoursLabel = weekend ? "8:00 AM - 4:00 PM" : "7:00 AM - 6:00 PM";

        List<StoreHoursDto> hours = List.of(
                new StoreHoursDto("Mon-Fri", "07:00", "18:00"),
                new StoreHoursDto("Sat-Sun", "08:00", "16:00")
        );

        return new StoreInfoDto(NAME, ADDRESS, PHONE, MAP_URL, isOpen, todayHoursLabel, hours);
    }
}
