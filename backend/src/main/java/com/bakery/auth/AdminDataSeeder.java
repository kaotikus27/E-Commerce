package com.bakery.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Seeds a single starter admin account on boot so the Admin Dashboard is reachable without a sign-up flow. */
@Component
@RequiredArgsConstructor
public class AdminDataSeeder implements CommandLineRunner {

    public static final String ADMIN_EMAIL = "admin@homebybami.local";
    public static final String ADMIN_STARTER_PASSWORD = "ChangeMe123!";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail(ADMIN_EMAIL)) return;

        User admin = User.builder()
                .name("Bami")
                .email(ADMIN_EMAIL)
                .passwordHash(passwordEncoder.encode(ADMIN_STARTER_PASSWORD))
                .role(Role.ADMIN)
                .build();

        userRepository.save(admin);
    }
}
