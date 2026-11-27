package com.lumora.shop.service;

import com.lumora.shop.model.AdminNotification;
import com.lumora.shop.model.NotificationType;
import com.lumora.shop.model.Order;
import com.lumora.shop.model.Product;
import com.lumora.shop.model.dto.AdminDtos.NotificationView;
import com.lumora.shop.repo.NotificationRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Creates and serves admin alerts. The create methods have no transaction of their own: they join the caller's
 * transaction, so a rolled-back order never leaves a "new order" alert behind.
 */
@Service
public class NotificationService {

    private final NotificationRepo repo;
    private final int lowStockThreshold;

    public NotificationService(NotificationRepo repo, @Value("${app.stock.low-threshold:5}") int lowStockThreshold) {
        this.repo = repo;
        this.lowStockThreshold = lowStockThreshold;
    }

    public int lowStockThreshold() {
        return lowStockThreshold;
    }

    /** One alert for every product line of a new order. */
    public void newOrderLine(Order order, Product product, int quantity) {
        save(NotificationType.NEW_ORDER,
                "New order " + order.getOrderId() + ": " + product.getName() + " x " + quantity
                        + " (stock left " + product.getStockQuantity() + ")",
                order.getOrderId(), product.getId());
    }

    /** Raises OUT_OF_STOCK or LOW_STOCK when the product's stock has dropped to the threshold or below. */
    public void stockChecked(Product product) {
        if (product.getStockQuantity() <= 0) {
            save(NotificationType.OUT_OF_STOCK, product.getName() + " is out of stock", null, product.getId());
        } else if (product.getStockQuantity() <= lowStockThreshold) {
            save(NotificationType.LOW_STOCK,
                    product.getName() + " is running low: " + product.getStockQuantity() + " left", null, product.getId());
        }
    }

    public void orderCancelled(Order order) {
        save(NotificationType.ORDER_CANCELLED, "Order " + order.getOrderId() + " was cancelled", order.getOrderId(), null);
    }

    private void save(NotificationType type, String message, String orderId, Integer productId) {
        repo.save(AdminNotification.builder()
                .type(type).message(message).orderId(orderId).productId(productId)
                .seen(false).createdAt(LocalDateTime.now()).build());
    }

    @Transactional(readOnly = true)
    public List<NotificationView> latest(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return repo.findAllByOrderByCreatedAtDesc(PageRequest.of(0, size)).stream()
                .map(n -> new NotificationView(n.getId(), n.getType().name(), n.getMessage(),
                        n.getOrderId(), n.getProductId(), n.isSeen(), n.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return repo.countBySeenFalse();
    }

    @Transactional
    public void markSeen(Long id) {
        repo.findById(id).ifPresent(n -> n.setSeen(true));
    }

    @Transactional
    public void markAllSeen() {
        repo.markAllSeen();
    }
}
