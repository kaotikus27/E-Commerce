package com.bakery.store;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
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

    /** Path to the admin-uploaded GCash QR code image, shown at checkout. Blank until set. */
    private String gcashQrImagePath;

    /** The store's physical pinpoint — shown publicly and used as the Lalamove delivery quote
     *  origin. Re-geocoded automatically whenever an admin changes storeAddress.
     *  precision/scale explicit: Hibernate defaults an unannotated BigDecimal column to scale 2,
     *  which silently rounds GPS coordinates to ~1km precision — enough to land a reverse-geocode
     *  on a different building than the one actually pinned. */
    private String storeAddress;
    @Column(precision = 11, scale = 8)
    private BigDecimal storeLatitude;
    @Column(precision = 11, scale = 8)
    private BigDecimal storeLongitude;

    /** E.164 format (e.g. "+639171234567") — required as the Lalamove dispatch sender phone. */
    private String storePhone;
}
