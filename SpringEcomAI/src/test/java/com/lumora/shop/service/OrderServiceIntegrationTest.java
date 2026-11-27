package com.lumora.shop.service;

import com.lumora.shop.exception.InsufficientStockException;
import com.lumora.shop.exception.InvalidOrderStateException;
import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Product;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.OrderItemRequest;
import com.lumora.shop.model.dto.OrderRequest;
import com.lumora.shop.repo.OrderRepo;
import com.lumora.shop.repo.ProductRepo;
import com.lumora.shop.repo.UserRepo;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves the guarantees that mocks cannot: real row locking, real transaction rollback, real SQL.
 * Runs against a throw-away PostgreSQL+pgvector container (skipped automatically if Docker is unavailable).
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class OrderServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"));

    @MockitoBean
    VectorStore vectorStore;   // no OpenAI calls

    @Autowired OrderService orderService;
    @Autowired ProductRepo productRepo;
    @Autowired OrderRepo orderRepo;
    @Autowired UserRepo userRepo;
    @Autowired JdbcTemplate jdbc;

    @AfterEach
    void clean() {
        jdbc.execute("TRUNCATE TABLE order_item, orders, product, app_user RESTART IDENTITY CASCADE");
    }

    private Product saveProduct(String name, int stock) {
        Product p = new Product();
        p.setName(name);
        p.setBrand("Brand");
        p.setCategory("Toys");
        p.setDescription("desc");
        p.setPrice(new BigDecimal("50.00"));
        p.setReleaseDate(new Date());
        p.setProductAvailable(true);
        p.setStockQuantity(stock);
        return productRepo.save(p);
    }

    private void saveUser(String email) {
        userRepo.save(AppUser.builder().email(email).fullName("Test").passwordHash("x")
                .role(Role.USER).createdAt(LocalDateTime.now()).build());
    }

    private static OrderRequest request(OrderItemRequest... lines) {
        return new OrderRequest("Test", "t@shop.test", List.of(lines));
    }

    private int stockOf(Product p) {
        return productRepo.findById(p.getId()).orElseThrow().getStockQuantity();
    }

    @Test
    void twoConcurrentOrdersForTheLastUnit_exactlyOneSucceeds() throws Exception {
        Product p = saveProduct("Last unit", 1);
        saveUser("a@shop.test");
        saveUser("b@shop.test");

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = pool.submit(buyOne(start, p, "a@shop.test"));
            Future<Boolean> second = pool.submit(buyOne(start, p, "b@shop.test"));
            start.countDown();

            boolean firstWon = first.get(30, TimeUnit.SECONDS);
            boolean secondWon = second.get(30, TimeUnit.SECONDS);

            assertThat(firstWon ^ secondWon).as("exactly one order may succeed").isTrue();
        } finally {
            pool.shutdownNow();
        }
        assertThat(stockOf(p)).isZero();                  // never negative
        assertThat(orderRepo.count()).isEqualTo(1);
    }

    private Callable<Boolean> buyOne(CountDownLatch start, Product p, String email) {
        return () -> {
            start.await();
            try {
                orderService.placeOrder(request(new OrderItemRequest(p.getId(), 1)), email);
                return true;
            } catch (InsufficientStockException e) {
                return false;
            }
        };
    }

    @Test
    void failedOrderRollsBackEveryLine() {
        Product plenty = saveProduct("Plenty", 5);       // lower id: processed (and decremented) first
        Product none = saveProduct("None", 0);           // then this line fails
        saveUser("a@shop.test");

        assertThatThrownBy(() -> orderService.placeOrder(
                request(new OrderItemRequest(plenty.getId(), 2), new OrderItemRequest(none.getId(), 1)), "a@shop.test"))
                .isInstanceOf(InsufficientStockException.class);

        assertThat(stockOf(plenty)).as("first line must be rolled back").isEqualTo(5);
        assertThat(orderRepo.count()).isZero();
    }

    @Test
    void cancelRestoresStock_andCannotBeRepeated() {
        Product p = saveProduct("Item", 5);
        saveUser("a@shop.test");

        String orderId = orderService.placeOrder(request(new OrderItemRequest(p.getId(), 2)), "a@shop.test").orderId();
        assertThat(stockOf(p)).isEqualTo(3);

        assertThat(orderService.cancelOrder(orderId, "a@shop.test", false).status()).isEqualTo("CANCELLED");
        assertThat(stockOf(p)).isEqualTo(5);

        assertThatThrownBy(() -> orderService.cancelOrder(orderId, "a@shop.test", false))
                .isInstanceOf(InvalidOrderStateException.class);
        assertThat(stockOf(p)).as("a second cancel must not restore stock twice").isEqualTo(5);
    }

    @Test
    void customersOnlySeeTheirOwnOrders() {
        Product p = saveProduct("Item", 10);
        saveUser("a@shop.test");
        saveUser("b@shop.test");
        orderService.placeOrder(request(new OrderItemRequest(p.getId(), 1)), "a@shop.test");
        orderService.placeOrder(request(new OrderItemRequest(p.getId(), 1)), "b@shop.test");

        assertThat(orderService.getOrderResponsesForUser("a@shop.test")).hasSize(1);
        assertThat(orderService.getAllOrderResponses()).hasSize(2);
    }
}
