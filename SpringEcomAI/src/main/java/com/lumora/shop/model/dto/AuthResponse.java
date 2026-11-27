package com.lumora.shop.model.dto;

public record AuthResponse(String token, String email, String fullName, String role) {}
