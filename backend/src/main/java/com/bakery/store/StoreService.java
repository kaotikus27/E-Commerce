package com.bakery.store;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class StoreService {

    private static final String NAME = "Home by Bami";

    private final StoreSettingsService storeSettingsService;

    public String getName() {
        return NAME;
    }

    /** The store's pinpoint address — admin-editable via Store Settings, re-geocoded on change. */
    public String getAddress() {
        return storeSettingsService.getSettings().storeAddress();
    }

    /** E.164 phone — admin-editable via Store Settings, blank until set. Required for Lalamove dispatch. */
    public String getPhone() {
        return storeSettingsService.getSettings().storePhone();
    }

    public BigDecimal getLatitude() {
        return storeSettingsService.getSettingsEntity().getStoreLatitude();
    }

    public BigDecimal getLongitude() {
        return storeSettingsService.getSettingsEntity().getStoreLongitude();
    }

    private String getMapUrl() {
        String address = getAddress();
        return "https://maps.google.com/?q=" + URLEncoder.encode(address != null ? address : NAME, StandardCharsets.UTF_8);
    }

    public StoreInfoDto getStoreInfo() {
        StoreSettingsDto settings = storeSettingsService.getSettings();
        return new StoreInfoDto(
                NAME, settings.storeAddress(), settings.storePhone(), getMapUrl(),
                storeSettingsService.isAcceptingOrders(),
                storeSettingsService.todayHoursLabel(),
                settings.orderLeadTimeMinutes(),
                settings.schedule(),
                settings.gcashAccountName(),
                settings.gcashNumber(),
                settings.gcashQrImagePath()
        );
    }
}
