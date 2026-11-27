package com.lumora.shop.config;

import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Role;
import com.lumora.shop.repo.UserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Locale;

/** Creates the first ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD (env vars). Registration can only create USERs. */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminSeeder(UserRepo userRepo, PasswordEncoder passwordEncoder,
                       @Value("${app.admin.email:}") String adminEmail,
                       @Value("${app.admin.password:}") String adminPassword) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            log.info("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin account seeded.");
            return;
        }
        String email = adminEmail.trim().toLowerCase(Locale.ROOT);
        if (userRepo.existsByEmail(email)) {
            return;
        }
        userRepo.save(AppUser.builder()
                .email(email)
                .fullName("Administrator")
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(Role.ADMIN)
                .createdAt(LocalDateTime.now())
                .build());
        log.info("Seeded ADMIN account for {}", email);
    }
}
