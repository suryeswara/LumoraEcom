package com.lumora.shop.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        String orderId,
        String customerName,
        String email,
        String status,
        LocalDate orderDate,
        List<OrderItemResponse> items,
        BigDecimal totalAmount,
        String paymentMethod,
        String paymentStatus,
        String shippingAddress,
        String phone,
        String carrier,
        String trackingNumber,
        LocalDateTime shippedAt,
        LocalDateTime deliveredAt
) {
    /** Short form used by tests: no payment or shipment details. */
    public OrderResponse(String orderId, String customerName, String email, String status,
                         LocalDate orderDate, List<OrderItemResponse> items) {
        this(orderId, customerName, email, status, orderDate, items,
                null, null, null, null, null, null, null, null, null);
    }
}
