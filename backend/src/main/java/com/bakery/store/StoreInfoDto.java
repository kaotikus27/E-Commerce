package com.bakery.store;

import java.math.BigDecimal;
import java.util.List;

public record StoreInfoDto(
        String name,
        String address,
        String phone,
        String mapUrl,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean open,
        String todayHoursLabel,
        int orderLeadTimeMinutes,
        List<DayScheduleDto> schedule,
        String gcashAccountName,
        String gcashNumber,
        String gcashQrImagePath
) {
}
