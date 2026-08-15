package com.bakery.catalog;

import java.util.List;

public record CustomizationDto(String name, List<CustomizationOptionDto> options, boolean required) {
    public static CustomizationDto from(Customization c) {
        List<CustomizationOptionDto> options = CustomizationOptionCodec.decode(c.getOptionsCsv()).stream()
                .map(o -> new CustomizationOptionDto(o.name(), o.priceDelta()))
                .toList();
        return new CustomizationDto(c.getName(), options, c.isRequired());
    }
}
