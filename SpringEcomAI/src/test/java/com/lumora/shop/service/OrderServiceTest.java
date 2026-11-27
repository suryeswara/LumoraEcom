package com.lumora.shop.service;

import com.lumora.shop.exception.InsufficientStockException;
import com.lumora.shop.exception.InvalidOrderStateException;
import com.lumora.shop.exception.ResourceNotFoundException;
import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Order;
import com.lumora.shop.model.OrderItem;
import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.Product;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.OrderItemRequest;
import com.lumora.shop.model.dto.OrderRequest;
import com.lumora.shop.model.dto.OrderResponse;
import com.lumora.shop.repo.OrderRepo;
import com.lumora.shop.repo.ProductRepo;
import com.lumora.shop.repo.UserRepo;
import com.lumora.shop.vector.VectorUpsertEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Pure unit tests (repositories mocked). Locking/rollback against a real DB are in OrderServiceIntegrationTest. */
class OrderServiceTest {

    private final OrderRepo orderRepo = mock(OrderRepo.class);
    private final ProductRepo productRepo = mock(ProductRepo.class);
    private final UserRepo userRepo = mock(UserRepo.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final OrderService service = new OrderService(orderRepo, productRepo, userRepo, events, notifications);

    private final AppUser user = AppUser.builder().id(1L).email("u@shop.test").fullName("U")
            .passwordHash("x").role(Role.USER).build();

    @BeforeEach
    void setUp() {
        when(userRepo.findByEmail("u@shop.test")).thenReturn(Optional.of(user));
        when(orderRepo.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static Product product(int id, String name, int stock, String price) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setPrice(new BigDecimal(price));
        p.setStockQuantity(stock);
        return p;
    }

    private static OrderRequest request(OrderItemRequest... lines) {
        return new OrderRequest("Asha", "asha@x.com", List.of(lines));
    }

    private static Order existingOrder(String orderId, OrderStatus status, AppUser owner, OrderItem... items) {
        Order o = new Order();
        o.setOrderId(orderId);
        o.setStatus(status);
        o.setUser(owner);
        o.setItems(new ArrayList<>(List.of(items)));
        return o;
    }

    private static OrderItem line(Product p, int qty) {
        return OrderItem.builder().product(p).quantity(qty)
                .totalPrice(p.getPrice().multiply(BigDecimal.valueOf(qty))).build();
    }

    // ---------------- placeOrder ----------------

    @Test
    void placeOrder_reservesStock_linksOwner_andPublishesIndexEvents() {
        Product p = product(5, "Laptop", 10, "100.00");
        when(productRepo.findByIdForUpdate(5)).thenReturn(Optional.of(p));

        OrderResponse res = service.placeOrder(request(new OrderItemRequest(5, 3)), "u@shop.test");

        assertThat(p.getStockQuantity()).isEqualTo(7);
        assertThat(res.status()).isEqualTo("PLACED");
        assertThat(res.items()).hasSize(1);
        assertThat(res.items().get(0).totalPrice()).isEqualByComparingTo("300.00");

        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(orderRepo).save(saved.capture());
        assertThat(saved.getValue().getUser()).isSameAs(user);

        // one embedding refresh for the product, one for the order
        verify(events, times(2)).publishEvent(any(VectorUpsertEvent.class));
    }

    @Test
    void placeOrder_insufficientStock_savesNothingAndPublishesNothing() {
        Product p = product(5, "Laptop", 2, "100.00");
        when(productRepo.findByIdForUpdate(5)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.placeOrder(request(new OrderItemRequest(5, 3)), "u@shop.test"))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Laptop");

        verify(orderRepo, never()).save(any());
        verifyNoInteractions(events);
    }

    @Test
    void placeOrder_mergesDuplicateLines() {
        Product p = product(5, "Laptop", 10, "100.00");
        when(productRepo.findByIdForUpdate(5)).thenReturn(Optional.of(p));

        OrderResponse res = service.placeOrder(
                request(new OrderItemRequest(5, 2), new OrderItemRequest(5, 3)), "u@shop.test");

        assertThat(p.getStockQuantity()).isEqualTo(5);
        assertThat(res.items()).hasSize(1);
        assertThat(res.items().get(0).quantity()).isEqualTo(5);
    }

    @Test
    void placeOrder_locksProductsInAscendingIdOrder_toAvoidDeadlocks() {
        when(productRepo.findByIdForUpdate(3)).thenReturn(Optional.of(product(3, "A", 5, "10")));
        when(productRepo.findByIdForUpdate(9)).thenReturn(Optional.of(product(9, "B", 5, "10")));

        service.placeOrder(request(new OrderItemRequest(9, 1), new OrderItemRequest(3, 1)), "u@shop.test");

        InOrder order = inOrder(productRepo);
        order.verify(productRepo).findByIdForUpdate(3);
        order.verify(productRepo).findByIdForUpdate(9);
    }

    @Test
    void placeOrder_unknownProduct_isNotFound() {
        when(productRepo.findByIdForUpdate(77)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.placeOrder(request(new OrderItemRequest(77, 1)), "u@shop.test"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------------- cancel ----------------

    @Test
    void cancel_restoresStock_andMarksCancelled() {
        Product p = product(5, "Laptop", 7, "100.00");
        Order o = existingOrder("ORD1", OrderStatus.PLACED, user, line(p, 3));
        when(orderRepo.findByOrderIdAndUser_Email("ORD1", "u@shop.test")).thenReturn(Optional.of(o));
        when(productRepo.findByIdForUpdate(5)).thenReturn(Optional.of(p));

        OrderResponse res = service.cancelOrder("ORD1", "u@shop.test", false);

        assertThat(res.status()).isEqualTo("CANCELLED");
        assertThat(p.getStockQuantity()).isEqualTo(10);
        verify(events, times(2)).publishEvent(any(VectorUpsertEvent.class));   // product + order
    }

    @Test
    void cancel_afterShipping_isRejected_andStockUntouched() {
        Product p = product(5, "Laptop", 7, "100.00");
        Order o = existingOrder("ORD1", OrderStatus.SHIPPED, user, line(p, 3));
        when(orderRepo.findByOrderIdAndUser_Email("ORD1", "u@shop.test")).thenReturn(Optional.of(o));

        assertThatThrownBy(() -> service.cancelOrder("ORD1", "u@shop.test", false))
                .isInstanceOf(InvalidOrderStateException.class);
        assertThat(p.getStockQuantity()).isEqualTo(7);
    }

    @Test
    void cancel_someoneElsesOrder_looksLikeNotFound() {
        when(orderRepo.findByOrderIdAndUser_Email("ORD1", "u@shop.test")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cancelOrder("ORD1", "u@shop.test", false))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(orderRepo, never()).findByOrderId(any());
    }

    @Test
    void cancel_asAdmin_canTargetAnyOrder() {
        Product p = product(5, "Laptop", 7, "100.00");
        Order o = existingOrder("ORD1", OrderStatus.CONFIRMED, user, line(p, 1));
        when(orderRepo.findByOrderId("ORD1")).thenReturn(Optional.of(o));
        when(productRepo.findByIdForUpdate(5)).thenReturn(Optional.of(p));

        assertThat(service.cancelOrder("ORD1", "admin@shop.test", true).status()).isEqualTo("CANCELLED");
        assertThat(p.getStockQuantity()).isEqualTo(8);
    }

    // ---------------- admin status updates ----------------

    @Test
    void updateStatus_allowsForwardStep() {
        Order o = existingOrder("ORD1", OrderStatus.PLACED, user);
        when(orderRepo.findByOrderId("ORD1")).thenReturn(Optional.of(o));

        assertThat(service.updateStatus("ORD1", OrderStatus.CONFIRMED).status()).isEqualTo("CONFIRMED");
    }

    @Test
    void updateStatus_rejectsIllegalJump() {
        Order o = existingOrder("ORD1", OrderStatus.PLACED, user);
        when(orderRepo.findByOrderId("ORD1")).thenReturn(Optional.of(o));

        assertThatThrownBy(() -> service.updateStatus("ORD1", OrderStatus.DELIVERED))
                .isInstanceOf(InvalidOrderStateException.class);
        assertThat(o.getStatus()).isEqualTo(OrderStatus.PLACED);
    }
}
