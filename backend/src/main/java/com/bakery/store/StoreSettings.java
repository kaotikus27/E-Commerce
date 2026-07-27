package com.bakery.store;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/** Single-row table (id always 1) holding the admin-editable ordering schedule and pause switch. */
@Entity
@Table(name = "store_settings")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreSettings {

    @Id
    private Long id;

    private boolean emergencyPause;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "store_settings_schedule", joinColumns = @JoinColumn(name = "store_settings_id"))
    private List<DaySchedule> schedule = new ArrayList<>();

    private int orderLeadTimeMinutes;
    private int stopOrderingBeforeCloseMinutes;

    /** GCash account customers should send manual payments to. Blank until an admin sets it. */
    private String gcashAccountName;
    private String gcashNumber;
}
