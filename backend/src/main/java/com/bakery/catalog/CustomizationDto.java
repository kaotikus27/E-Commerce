package com.bakery.catalog;

import java.util.Arrays;
import java.util.List;

public record CustomizationDto(String name, List<String> options, boolean required) {
    public static CustomizationDto from(Customization c) {
        List<String> options = c.getOptionsCsv() == null || c.getOptionsCsv().isBlank()
                ? List.of()
                : Arrays.asList(c.getOptionsCsv().split(","));
        return new CustomizationDto(c.getName(), options, c.isRequired());
    }
}
