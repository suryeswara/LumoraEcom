package com.lumora.shop.service;

import com.lumora.shop.exception.InsufficientStockException;
import com.lumora.shop.exception.InvalidOrderStateException;
import com.lumora.shop.exception.ResourceNotFoundException;
import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Order;
import com.lumora.shop.model.OrderItem;
import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.PaymentMethod;
import com.lumora.shop.model.PaymentStatus;
import com.lumora.shop.model.Product;
import com.lumora.shop.model.dto.OrderItemRequest;
import com.lumora.shop.model.dto.OrderItemResponse;
import com.lumora.shop.model.dto.OrderRequest;
import com.lumora.shop.model.dto.OrderResponse;
import com.lumora.shop.repo.OrderRepo;
import com.lumora.shop.repo.ProductRepo;
import com.lumora.shop.repo.UserRepo;
import com.lumora.shop.vector.VectorDocs;
import com.lumora.shop.vector.VectorUpsertEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepo orderRepo;
    private final ProductRepo productRepo;
    private final UserRepo userRepo;
    private final ApplicationEventPublisher events;
    private final NotificationService notifications;

    public OrderService(OrderRepo orderRepo, ProductRepo productRepo, UserRepo userRepo,
                        ApplicationEventPublisher events, NotificationService notifications) {
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.userRepo = userRepo;
        this.events = events;
        this.notifications = notifications;
    }

    /**
     * Places an order atomically: either every line is reserved and the order is saved, or nothing changes.
     * Concurrency: each product row is locked (SELECT ... FOR UPDATE) before its stock is checked, and rows are
     * always locked in ascending product-id order so two orders can never deadlock each other.
     * Vector-store updates are published as events and applied only after COMMIT. Admin notifications are saved
     * in the same transaction, so they exist if and only if the order does.
     */
    @Transactional
    public OrderResponse placeOrder(OrderRequest request, String userEmail) {
        AppUser user = userRepo.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        // Merge duplicate lines; TreeMap iterates in ascending product-id order (deterministic lock order).
        Map<Integer, Integer> wanted = new TreeMap<>();
        for (OrderItemRequest line : request.items()) {
            wanted.merge(line.productId(), line.quantity(), Integer::sum);
        }

        Order order = new Order();
        order.setUser(user);   // owner comes from the verified JWT, never from the request body
        order.setOrderId("ORD" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        order.setCustomerName(request.customerName());
        order.setEmail(request.email());
        order.setOrderDate(LocalDate.now());
        order.setCreatedAt(LocalDateTime.now());
        order.setStatus(OrderStatus.PLACED);
        order.setShippingAddress(request.shippingAddress());
        order.setPhone(request.phone());
        order.setPaymentMethod(request.paymentMethod() == null ? PaymentMethod.COD : request.paymentMethod());
        order.setPaymentStatus(PaymentStatus.PENDING);

        List<OrderItem> orderItems = new ArrayList<>();
        List<Product> changedProducts = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (Map.Entry<Integer, Integer> line : wanted.entrySet()) {
            int productId = line.getKey();
            int quantity = line.getValue();

            Product product = productRepo.findByIdForUpdate(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product " + productId + " not found"));

            if (product.getStockQuantity() < quantity) {
                throw new InsufficientStockException("Insufficient stock for " + product.getName()
                        + " (available: " + product.getStockQuantity() + ", requested: " + quantity + ")");
            }

            product.setStockQuantity(product.getStockQuantity() - quantity);   // flushed at commit
            changedProducts.add(product);

            // The price always comes from the database, never from the client.
            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));
            total = total.add(lineTotal);
            orderItems.add(OrderItem.builder()
                    .product(product)
                    .quantity(quantity)
                    .totalPrice(lineTotal)
                    .order(order)
                    .build());
        }

        order.setTotalAmount(total);
        order.setItems(orderItems);
        Order saved = orderRepo.save(order);

        for (OrderItem item : orderItems) {
            notifications.newOrderLine(saved, item.getProduct(), item.getQuantity());
        }
        changedProducts.forEach(notifications::stockChecked);

        changedProducts.forEach(this::publishProduct);
        publishOrder(saved);
        return toResponse(saved);
    }

    /** Customer cancels their own order (admins may cancel any). Allowed only before shipping; stock is restored. */
    @Transactional
    public OrderResponse cancelOrder(String orderId, String callerEmail, boolean admin) {
        // A customer asking for someone else's order gets "not found", not "forbidden": no existence leak.
        Order order = (admin
                ? orderRepo.findByOrderId(orderId)
                : orderRepo.findByOrderIdAndUser_Email(orderId, callerEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Order " + orderId + " not found"));

        if (!order.getStatus().isCancellable()) {
            throw new InvalidOrderStateException(
                    "Order " + orderId + " can no longer be cancelled (status: " + order.getStatus() + ")");
        }
        return applyStatus(order, OrderStatus.CANCELLED, null, null);
    }

    /** ADMIN: move an order forward along its lifecycle. Illegal jumps are rejected. */
    @Transactional
    public OrderResponse updateStatus(String orderId, OrderStatus next) {
        return updateStatus(orderId, next, null, null);
    }

    /** Same as above; carrier and tracking number are stored when the order is marked SHIPPED. */
    @Transactional
    public OrderResponse updateStatus(String orderId, OrderStatus next, String carrier, String trackingNumber) {
        Order order = orderRepo.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order " + orderId + " not found"));

        if (!order.getStatus().canTransitionTo(next)) {
            throw new InvalidOrderStateException(
                    "Cannot change order " + orderId + " from " + order.getStatus() + " to " + next);
        }
        return applyStatus(order, next, carrier, trackingNumber);
    }

    /** ADMIN: record the payment state of an order (for example, UPI money received). */
    @Transactional
    public OrderResponse updatePaymentStatus(String orderId, PaymentStatus payment) {
        Order order = orderRepo.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order " + orderId + " not found"));
        if (order.getStatus() == OrderStatus.CANCELLED && payment == PaymentStatus.PAID) {
            throw new InvalidOrderStateException("A cancelled order cannot be marked as paid");
        }
        order.setPaymentStatus(payment);
        return toResponse(order);
    }

    private OrderResponse applyStatus(Order order, OrderStatus next, String carrier, String trackingNumber) {
        switch (next) {
            case CANCELLED -> {
                restoreStock(order);
                // Money already received goes back to the customer: the record moves to REFUNDED.
                if (order.getPaymentStatus() == PaymentStatus.PAID) {
                    order.setPaymentStatus(PaymentStatus.REFUNDED);
                }
                notifications.orderCancelled(order);
            }
            case SHIPPED -> {
                order.setShippedAt(LocalDateTime.now());
                order.setCarrier(blankToNull(carrier));
                order.setTrackingNumber(blankToNull(trackingNumber));
            }
            case DELIVERED -> {
                order.setDeliveredAt(LocalDateTime.now());
                // This version collects payment at the door (cash, UPI or card on delivery), so delivery settles it.
                if (order.getPaymentStatus() == PaymentStatus.PENDING) {
                    order.setPaymentStatus(PaymentStatus.PAID);
                }
            }
            default -> { }
        }
        order.setStatus(next);
        publishOrder(order);
        return toResponse(order);
    }

    private void restoreStock(Order order) {
        List<OrderItem> items = new ArrayList<>(order.getItems());
        items.sort(Comparator.comparingInt(i -> i.getProduct().getId()));      // same lock order as placeOrder
        for (OrderItem item : items) {
            productRepo.findByIdForUpdate(item.getProduct().getId()).ifPresent(product -> {
                product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                publishProduct(product);
            });
        }
    }

    /** ADMIN view: every order, newest first. */
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrderResponses() {
        return orderRepo.findAll().stream()
                .sorted(Comparator.comparing(Order::getId).reversed())
                .map(this::toResponse).toList();
    }

    /** USER view: only the caller's own orders, newest first. */
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrderResponsesForUser(String email) {
        return orderRepo.findByUser_Email(email).stream()
                .sorted(Comparator.comparing(Order::getId).reversed())
                .map(this::toResponse).toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void publishProduct(Product product) {
        events.publishEvent(new VectorUpsertEvent(
                VectorDocs.productFilter(product.getId()),
                VectorDocs.productContent(product),
                VectorDocs.productMetadata(product.getId())));
    }

    private void publishOrder(Order order) {
        events.publishEvent(new VectorUpsertEvent(
                VectorDocs.orderFilter(order.getOrderId()),
                VectorDocs.orderContent(order),
                VectorDocs.orderMetadata(order)));
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(i -> new OrderItemResponse(i.getProduct().getName(), i.getQuantity(), i.getTotalPrice()))
                .toList();
        // Orders from before totalAmount existed: add up the lines.
        BigDecimal total = order.getTotalAmount() != null ? order.getTotalAmount()
                : order.getItems().stream().map(OrderItem::getTotalPrice)
                        .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new OrderResponse(
                order.getOrderId(),
                order.getCustomerName(),
                order.getEmail(),
                order.getStatus() == null ? null : order.getStatus().name(),
                order.getOrderDate(),
                itemResponses,
                total,
                order.getPaymentMethod() == null ? null : order.getPaymentMethod().name(),
                order.getPaymentStatus() == null ? null : order.getPaymentStatus().name(),
                order.getShippingAddress(),
                order.getPhone(),
                order.getCarrier(),
                order.getTrackingNumber(),
                order.getShippedAt(),
                order.getDeliveredAt());
    }
}
