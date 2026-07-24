package com.bakery.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lets the signed-in admin change their own password. Covered by the existing /api/v1/admin/** -> ADMIN rule. */
@RestController
@RequestMapping("/api/v1/admin/password")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AuthService authService;

    @PutMapping
    public ResponseEntity<Void> changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }
}
