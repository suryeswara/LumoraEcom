package com.lumora.shop.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** No "role" field on purpose: clients can never choose their own role (prevents privilege escalation). */
public record RegisterRequest(
        @NotBlank(message = "Full name is required") @Size(max = 100) String fullName,
        @NotBlank(message = "Email is required") @Email(message = "Enter a valid email") @Size(max = 255) String email,
        // BCrypt only uses the first 72 bytes, so cap the length.
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters") String password
) {}
