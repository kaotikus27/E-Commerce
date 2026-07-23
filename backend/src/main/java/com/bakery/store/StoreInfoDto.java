package com.bakery.store;

import java.util.List;

public record StoreInfoDto(
        String name,
        String address,
        String phone,
        String mapUrl,
        boolean open,
        String todayHoursLabel,
        List<StoreHoursDto> hours
) {
}
