package com.lumora.shop.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Table is "app_user": "user" is a reserved word in PostgreSQL. */
@Entity
@Table(name = "app_user")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;          // stored lower-case; used as the login name

    @Column(nullable = false)
    private String fullName;

    @ToString.Exclude              // never let the hash end up in logs
    @Column(nullable = false)
    private String passwordHash;   // BCrypt hash, never the raw password

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private LocalDateTime createdAt;
}
