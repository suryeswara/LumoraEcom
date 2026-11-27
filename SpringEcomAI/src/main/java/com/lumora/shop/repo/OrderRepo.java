package com.lumora.shop.repo;

import com.lumora.shop.model.Order;
import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.PaymentStatus;
import com.lumora.shop.repo.Projections.CustomerStats;
import com.lumora.shop.repo.Projections.KeyCount;
import com.lumora.shop.repo.Projections.OrderSummaryView;
import com.lumora.shop.repo.Projections.ProductSales;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepo extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderId(String orderId);

    /** Ownership-scoped lookup: a customer can never load somebody else's order. */
    Optional<Order> findByOrderIdAndUser_Email(String orderId, String email);

    // Fetch items, products and owner in one query instead of one query per order (N+1).
    @Override
    @EntityGraph(attributePaths = {"items", "items.product", "user"})
    List<Order> findAll();

    @EntityGraph(attributePaths = {"items", "items.product"})
    List<Order> findByUser_Email(String email);

    @EntityGraph(attributePaths = {"items", "items.product", "user"})
    List<Order> findByUser_EmailOrderByIdDesc(String email);

    // ---------------- admin analytics (aggregates run in PostgreSQL, no images are loaded) ----------------

    /** Orders that predate the totalAmount column; filled once at startup by LegacyOrderBackfill. */
    @EntityGraph(attributePaths = {"items"})
    List<Order> findByTotalAmountIsNull();

    @Query("select o.status as grp, count(o) as cnt from orders o group by o.status")
    List<KeyCount> countGroupedByStatus();

    @Query("select o.paymentStatus as grp, count(o) as cnt from orders o where o.status <> :excluded group by o.paymentStatus")
    List<KeyCount> countGroupedByPaymentStatus(@Param("excluded") OrderStatus excluded);

    @Query("select sum(o.totalAmount) from orders o where o.paymentStatus = :payment and o.status <> :excluded")
    BigDecimal sumTotalByPaymentStatus(@Param("payment") PaymentStatus payment, @Param("excluded") OrderStatus excluded);

    @Query("select p.id as productId, p.name as name, sum(i.quantity) as units, sum(i.totalPrice) as revenue "
            + "from orders o join o.items i join i.product p where o.status <> :excluded "
            + "group by p.id, p.name order by sum(i.quantity) desc")
    List<ProductSales> productSales(@Param("excluded") OrderStatus excluded);

    @Query("select o.user.id as userId, count(o) as cnt, sum(o.totalAmount) as spent, max(o.orderDate) as lastOrder "
            + "from orders o where o.user is not null and o.status <> :excluded group by o.user.id")
    List<CustomerStats> customerStats(@Param("excluded") OrderStatus excluded);

    List<OrderSummaryView> findTop25ByOrderByIdDesc();

    List<OrderSummaryView> findByStatusInAndOrderDateBefore(Collection<OrderStatus> statuses, LocalDate before);

    long countByStatusAndPaymentStatus(OrderStatus status, PaymentStatus payment);

    long countByStatusAndShippedAtBefore(OrderStatus status, LocalDateTime before);
}
