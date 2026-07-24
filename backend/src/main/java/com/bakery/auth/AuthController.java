package com.bakery.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Customer self-registration is disabled — ordering is guest-only (Name/Phone/Email at
     * checkout), and admin accounts are seeded/managed directly, not created through this API.
     */
    @PostMapping("/register")
    public AuthResponseDto register(@Valid @RequestBody RegisterRequestDto request) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Account registration is disabled. Please continue as a guest at checkout.");
    }

    @PostMapping("/login")
    public AuthResponseDto login(@Valid @RequestBody LoginRequestDto request) {
        return authService.login(request);
    }
}
