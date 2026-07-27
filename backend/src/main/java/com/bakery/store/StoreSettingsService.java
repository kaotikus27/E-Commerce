package com.bakery.store;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StoreSettingsService {

    private final StoreSettingsRepository storeSettingsRepository;
    private final StoreClosureRepository storeClosureRepository;

    public StoreSettings getSettingsEntity() {
        return storeSettingsRepository.findById(1L)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Store settings not seeded"));
    }

    public StoreSettingsDto getSettings() {
        return StoreSettingsDto.from(getSettingsEntity());
    }

    @Transactional
    public StoreSettingsDto updateSchedule(StoreSettingsDto request) {
        StoreSettings settings = getSettingsEntity();
        // Hibernate needs a genuinely mutable list to manage this @ElementCollection —
        // Stream.toList() returns an immutable one, which throws deep inside the ORM on flush.
        settings.setSchedule(new ArrayList<>(request.schedule().stream().map(DayScheduleDto::toEntity).toList()));
        settings.setOrderLeadTimeMinutes(request.orderLeadTimeMinutes());
        settings.setStopOrderingBeforeCloseMinutes(request.stopOrderingBeforeCloseMinutes());
        settings.setGcashAccountName(request.gcashAccountName());
        settings.setGcashNumber(request.gcashNumber());
        return StoreSettingsDto.from(storeSettingsRepository.save(settings));
    }

    @Transactional
    public StoreSettingsDto setEmergencyPause(boolean paused) {
        StoreSettings settings = getSettingsEntity();
        settings.setEmergencyPause(paused);
        return StoreSettingsDto.from(storeSettingsRepository.save(settings));
    }

    public List<StoreClosureDto> listClosures() {
        return storeClosureRepository.findAllByOrderByDateAsc().stream().map(StoreClosureDto::from).toList();
    }

    public StoreClosureDto addClosure(StoreClosureDto request) {
        if (storeClosureRepository.existsByDate(request.date())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, request.date() + " is already marked closed");
        }
        StoreClosure closure = StoreClosure.builder().date(request.date()).reason(request.reason()).build();
        return StoreClosureDto.from(storeClosureRepository.save(closure));
    }

    public void removeClosure(Long id) {
        if (!storeClosureRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Closure " + id + " not found");
        }
        storeClosureRepository.deleteById(id);
    }

    /** Today's DaySchedule entry, resolved against the current settings. */
    private Optional<DaySchedule> todaySchedule(StoreSettings settings, DayOfWeek today) {
        return settings.getSchedule().stream().filter(d -> d.getDayOfWeek() == today).findFirst();
    }

    public boolean isAcceptingOrders() {
        StoreSettings settings = getSettingsEntity();
        if (settings.isEmergencyPause()) return false;

        LocalDate today = LocalDate.now();
        if (storeClosureRepository.existsByDate(today)) return false;

        Optional<DaySchedule> day = todaySchedule(settings, today.getDayOfWeek());
        if (day.isEmpty() || day.get().isClosedAllDay()) return false;

        LocalTime now = LocalTime.now();
        if (now.isBefore(day.get().getOpenTime())) return false;

        LocalTime closeTime = day.get().getCloseTime();
        if (closeTime != null) {
            LocalTime cutoff = closeTime.minusMinutes(settings.getStopOrderingBeforeCloseMinutes());
            if (!now.isBefore(cutoff)) return false;
        }

        return true;
    }

    /** Human-readable label for today, e.g. "5:00 PM - 12:00 MN" or "Closed Today". */
    public String todayHoursLabel() {
        StoreSettings settings = getSettingsEntity();
        DayOfWeek today = LocalDate.now().getDayOfWeek();

        if (storeClosureRepository.existsByDate(LocalDate.now())) return "Closed Today";

        Optional<DaySchedule> day = todaySchedule(settings, today);
        if (day.isEmpty() || day.get().isClosedAllDay()) return "Closed Today";

        String open = formatTime(day.get().getOpenTime());
        String close = day.get().getCloseTime() == null ? "12:00 MN" : formatTime(day.get().getCloseTime());
        return open + " - " + close;
    }

    private String formatTime(LocalTime time) {
        int hour = time.getHour() % 12 == 0 ? 12 : time.getHour() % 12;
        String period = time.getHour() >= 12 ? "PM" : "AM";
        return String.format("%d:%02d %s", hour, time.getMinute(), period);
    }
}
