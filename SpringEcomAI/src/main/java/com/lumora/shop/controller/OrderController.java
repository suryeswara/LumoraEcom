package com.lumora.shop.controller;

import com.lumora.shop.model.dto.OrderRequest;
import com.lumora.shop.model.dto.OrderResponse;
import com.lumora.shop.model.dto.UpdateOrderStatusRequest;
import com.lumora.shop.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping("/place")
    public ResponseEntity<OrderResponse> placeOrder(@Valid @RequestBody OrderRequest order, Authentication authentication) {
        return ResponseEntity.ok(orderService.placeOrder(order, authentication.getName()));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(Authentication authentication) {
        // ADMIN sees all orders; a USER sees only their own
        return ResponseEntity.ok(isAdmin(authentication)
                ? orderService.getAllOrderResponses()
                : orderService.getOrderResponsesForUser(authentication.getName()));
    }

    /** Customer cancels their own order (admin: any order). Only before it ships; stock is restored. */
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(@PathVariable String orderId, Authentication authentication) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId, authentication.getName(), isAdmin(authentication)));
    }

    /** ADMIN only (enforced in SecurityConfig): advance an order along PLACED, CONFIRMED, SHIPPED, DELIVERED. Carrier and tracking number are saved when shipping. */
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<OrderResponse> updateStatus(@PathVariable String orderId,
                                                      @Valid @RequestBody UpdateOrderStatusRequest body) {
        return ResponseEntity.ok(orderService.updateStatus(orderId, body.status(), body.carrier(), body.trackingNumber()));
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
