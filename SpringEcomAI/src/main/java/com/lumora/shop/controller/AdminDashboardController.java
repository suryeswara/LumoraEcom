package com.lumora.shop.controller;

import com.lumora.shop.model.dto.AdminDtos.AiAnswer;
import com.lumora.shop.model.dto.AdminDtos.AiQuestion;
import com.lumora.shop.model.dto.AdminDtos.CustomerRow;
import com.lumora.shop.model.dto.AdminDtos.Dashboard;
import com.lumora.shop.model.dto.AdminDtos.NotificationView;
import com.lumora.shop.model.dto.AdminDtos.StockRow;
import com.lumora.shop.model.dto.OrderResponse;
import com.lumora.shop.model.dto.UpdatePaymentRequest;
import com.lumora.shop.model.dto.UpdateStockRequest;
import com.lumora.shop.service.AdminAiService;
import com.lumora.shop.service.AdminService;
import com.lumora.shop.service.NotificationService;
import com.lumora.shop.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Everything under /api/admin/** is ADMIN only (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final AdminService adminService;
    private final NotificationService notifications;
    private final OrderService orderService;
    private final AdminAiService adminAiService;

    public AdminDashboardController(AdminService adminService, NotificationService notifications,
                                    OrderService orderService, AdminAiService adminAiService) {
        this.adminService = adminService;
        this.notifications = notifications;
        this.orderService = orderService;
        this.adminAiService = adminAiService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Dashboard> dashboard() {
        return ResponseEntity.ok(adminService.dashboard());
    }

    /** What needs attention, computed from the data (no AI call, so it is instant and free). */
    @GetMapping("/alerts")
    public ResponseEntity<List<String>> alerts() {
        return ResponseEntity.ok(adminService.alerts());
    }

    @GetMapping("/stock")
    public ResponseEntity<List<StockRow>> stock() {
        return ResponseEntity.ok(adminService.stock());
    }

    @PatchMapping("/products/{id}/stock")
    public ResponseEntity<StockRow> updateStock(@PathVariable int id, @Valid @RequestBody UpdateStockRequest body) {
        return ResponseEntity.ok(adminService.updateStock(id, body.stockQuantity()));
    }

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerRow>> customers() {
        return ResponseEntity.ok(adminService.customers());
    }

    @PatchMapping("/orders/{orderId}/payment")
    public ResponseEntity<OrderResponse> updatePayment(@PathVariable String orderId,
                                                       @Valid @RequestBody UpdatePaymentRequest body) {
        return ResponseEntity.ok(orderService.updatePaymentStatus(orderId, body.paymentStatus()));
    }

    // ---------------- notifications ----------------

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationView>> notifications(@RequestParam(defaultValue = "30") int limit) {
        return ResponseEntity.ok(notifications.latest(limit));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", notifications.unreadCount()));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        notifications.markSeen(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllRead() {
        notifications.markAllSeen();
        return ResponseEntity.noContent().build();
    }

    // ---------------- AI ----------------

    /** A ready made briefing: what needs attention in orders, payments and stock. */
    @GetMapping("/ai/insights")
    public ResponseEntity<AiAnswer> insights() {
        return ResponseEntity.ok(adminAiService.ask(null));
    }

    @PostMapping("/ai/ask")
    public ResponseEntity<AiAnswer> ask(@Valid @RequestBody AiQuestion body) {
        return ResponseEntity.ok(adminAiService.ask(body.question()));
    }
}
