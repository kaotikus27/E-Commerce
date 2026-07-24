package com.bakery.store;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only store hours / emergency pause / holiday closures management. */
@RestController
@RequiredArgsConstructor
public class AdminStoreSettingsController {

    private final StoreSettingsService storeSettingsService;

    @GetMapping("/api/v1/admin/store-settings")
    public StoreSettingsDto getSettings() {
        return storeSettingsService.getSettings();
    }

    @PutMapping("/api/v1/admin/store-settings")
    public StoreSettingsDto updateSettings(@Valid @RequestBody StoreSettingsDto request) {
        return storeSettingsService.updateSchedule(request);
    }

    @PatchMapping("/api/v1/admin/store-settings/pause")
    public StoreSettingsDto setPause(@RequestBody EmergencyPauseRequest request) {
        return storeSettingsService.setEmergencyPause(request.emergencyPause());
    }

    @GetMapping("/api/v1/admin/store-closures")
    public List<StoreClosureDto> listClosures() {
        return storeSettingsService.listClosures();
    }

    @PostMapping("/api/v1/admin/store-closures")
    public ResponseEntity<StoreClosureDto> addClosure(@Valid @RequestBody StoreClosureDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(storeSettingsService.addClosure(request));
    }

    @DeleteMapping("/api/v1/admin/store-closures/{id}")
    public ResponseEntity<Void> removeClosure(@PathVariable Long id) {
        storeSettingsService.removeClosure(id);
        return ResponseEntity.noContent().build();
    }
}
