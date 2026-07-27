package com.bakery.store;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StoreService {

    private static final String NAME = "Home by Bami";
    private static final String ADDRESS = "048 Kay Piskal Rd, Brgy. Tigbe, Norzagaray, Bulacan";
    private static final String PHONE = "";
    private static final String MAP_URL = "https://maps.google.com/?q=Home+by+Bami,+048+Kay+Piskal+Rd,+Brgy+Tigbe,+Norzagaray,+Bulacan";

    private final StoreSettingsService storeSettingsService;

    public StoreInfoDto getStoreInfo() {
        StoreSettingsDto settings = storeSettingsService.getSettings();
        return new StoreInfoDto(
                NAME, ADDRESS, PHONE, MAP_URL,
                storeSettingsService.isAcceptingOrders(),
                storeSettingsService.todayHoursLabel(),
                settings.orderLeadTimeMinutes(),
                settings.schedule(),
                settings.gcashAccountName(),
                settings.gcashNumber()
        );
    }
}
