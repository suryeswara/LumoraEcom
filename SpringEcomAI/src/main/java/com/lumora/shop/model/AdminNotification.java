package com.lumora.shop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** An alert shown to admins (new order lines, low stock, cancellations). Stored in PostgreSQL, polled by the admin UI. */
@Entity
@Table(name = "admin_notification")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false, length = 500)
    private String message;

    private String orderId;
    private Integer productId;

    /** "read" is awkward in SQL, so the flag is called seen. */
    @Column(nullable = false)
    private boolean seen;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
