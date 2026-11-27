package com.lumora.shop.service;

import com.lumora.shop.exception.EmailAlreadyUsedException;
import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.AuthResponse;
import com.lumora.shop.model.dto.LoginRequest;
import com.lumora.shop.model.dto.RegisterRequest;
import com.lumora.shop.repo.UserRepo;
import com.lumora.shop.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    static final String INVALID_LOGIN = "Invalid email or password";

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepo userRepo, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        if (userRepo.existsByEmail(email)) {
            throw new EmailAlreadyUsedException("An account with this email already exists");
        }
        AppUser user = AppUser.builder()
                .email(email)
                .fullName(request.fullName().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)                       // always USER: role is never taken from the client
                .createdAt(LocalDateTime.now())
                .build();
        return toResponse(userRepo.save(user));
    }

    public AuthResponse login(LoginRequest request) {
        // Same message for "no such user" and "wrong password" so attackers cannot discover which emails exist.
        AppUser user = userRepo.findByEmail(normalize(request.email()))
                .orElseThrow(() -> new BadCredentialsException(INVALID_LOGIN));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException(INVALID_LOGIN);
        }
        return toResponse(user);
    }

    private AuthResponse toResponse(AppUser user) {
        return new AuthResponse(jwtService.generateToken(user.getEmail(), user.getRole()),
                user.getEmail(), user.getFullName(), user.getRole().name());
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
