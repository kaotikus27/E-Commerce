package com.bakery.store;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record StoreClosureDto(Long id, @NotNull LocalDate date, String reason) {
    public static StoreClosureDto from(StoreClosure c) {
        return new StoreClosureDto(c.getId(), c.getDate(), c.getReason());
    }
}
