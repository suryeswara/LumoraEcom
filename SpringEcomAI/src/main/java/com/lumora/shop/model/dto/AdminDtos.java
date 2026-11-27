package com.lumora.shop.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Read-only views for the admin dashboard. None of them carries product image bytes. */
public final class AdminDtos {

    private AdminDtos() {}

    public record TopProduct(int productId, String name, long unitsSold, BigDecimal revenue) {}

    public record StockRow(int id, String name, String brand, String category, int stockQuantity,
                           boolean productAvailable, BigDecimal price, long unitsSold, boolean lowStock) {}

    public record CustomerRow(Long id, String fullName, String email, LocalDateTime joinedAt,
                              long orderCount, BigDecimal totalSpent, LocalDate lastOrderDate) {}

    public record Dashboard(
            long totalOrders,
            long totalCustomers,
            long totalProducts,
            long unitsOrdered,
            BigDecimal revenue,                 // paid orders only
            BigDecimal pendingPayments,         // open (not cancelled) orders that are not paid yet
            Map<String, Long> ordersByStatus,
            Map<String, Long> ordersByPaymentStatus,
            Map<String, Long> productsByCategory,
            List<StockRow> lowStock,
            List<TopProduct> topProducts,
            int lowStockThreshold) {}

    public record NotificationView(Long id, String type, String message, String orderId,
                                   Integer productId, boolean seen, LocalDateTime createdAt) {}

    public record AiQuestion(@jakarta.validation.constraints.NotBlank(message = "Ask a question")
                             @jakarta.validation.constraints.Size(max = 500, message = "Keep the question under 500 characters")
                             String question) {}

    public record AiAnswer(String answer, List<String> alerts, boolean aiAvailable) {}
}
