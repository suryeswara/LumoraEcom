package com.lumora.shop.service;

import com.lumora.shop.exception.ResourceNotFoundException;
import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.PaymentStatus;
import com.lumora.shop.model.Product;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.AdminDtos.CustomerRow;
import com.lumora.shop.model.dto.AdminDtos.Dashboard;
import com.lumora.shop.model.dto.AdminDtos.StockRow;
import com.lumora.shop.model.dto.AdminDtos.TopProduct;
import com.lumora.shop.repo.OrderRepo;
import com.lumora.shop.repo.ProductRepo;
import com.lumora.shop.repo.Projections.CustomerStats;
import com.lumora.shop.repo.Projections.KeyCount;
import com.lumora.shop.repo.Projections.OrderSummaryView;
import com.lumora.shop.repo.Projections.ProductSales;
import com.lumora.shop.repo.Projections.ProductStockView;
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
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Read models and stock maintenance for the admin dashboard. All aggregates are computed by PostgreSQL. */
@Service
public class AdminService {

    private static final int TOP_PRODUCTS = 5;
    private static final int STALLED_ORDER_DAYS = 2;
    private static final int SLOW_SHIPMENT_DAYS = 7;

    private final OrderRepo orderRepo;
    private final ProductRepo productRepo;
    private final UserRepo userRepo;
    private final NotificationService notifications;
    private final ApplicationEventPublisher events;

    public AdminService(OrderRepo orderRepo, ProductRepo productRepo, UserRepo userRepo,
                        NotificationService notifications, ApplicationEventPublisher events) {
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.userRepo = userRepo;
        this.notifications = notifications;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard() {
        List<ProductSales> sales = orderRepo.productSales(OrderStatus.CANCELLED);
        Map<Integer, ProductSales> salesById = sales.stream()
                .collect(Collectors.toMap(ProductSales::getProductId, Function.identity()));

        long units = sales.stream().mapToLong(s -> s.getUnits() == null ? 0 : s.getUnits()).sum();
        List<TopProduct> top = sales.stream().limit(TOP_PRODUCTS)
                .map(s -> new TopProduct(s.getProductId(), s.getName(), s.getUnits(), orZero(s.getRevenue()))).toList();

        Map<String, Long> byCategory = new LinkedHashMap<>();
        for (ProductStockView p : productRepo.findAllProjectedBy()) {
            byCategory.merge(p.getCategory() == null ? "Other" : p.getCategory(), 1L, Long::sum);
        }

        return new Dashboard(
                orderRepo.count(),
                userRepo.countByRole(Role.USER),
                productRepo.count(),
                units,
                orZero(orderRepo.sumTotalByPaymentStatus(PaymentStatus.PAID, OrderStatus.CANCELLED)),
                orZero(orderRepo.sumTotalByPaymentStatus(PaymentStatus.PENDING, OrderStatus.CANCELLED)),
                toMap(orderRepo.countGroupedByStatus()),
                toMap(orderRepo.countGroupedByPaymentStatus(OrderStatus.CANCELLED)),
                byCategory,
                stockRows(salesById).stream().filter(StockRow::lowStock).toList(),
                top,
                notifications.lowStockThreshold());
    }

    @Transactional(readOnly = true)
    public List<StockRow> stock() {
        Map<Integer, ProductSales> salesById = orderRepo.productSales(OrderStatus.CANCELLED).stream()
                .collect(Collectors.toMap(ProductSales::getProductId, Function.identity()));
        return stockRows(salesById);
    }

    private List<StockRow> stockRows(Map<Integer, ProductSales> salesById) {
        int threshold = notifications.lowStockThreshold();
        return productRepo.findAllProjectedBy().stream()
                .map(p -> {
                    ProductSales s = salesById.get(p.getId());
                    int stock = p.getStockQuantity() == null ? 0 : p.getStockQuantity();
                    return new StockRow(p.getId(), p.getName(), p.getBrand(),
                            p.getCategory() == null ? "Other" : p.getCategory(), stock,
                            Boolean.TRUE.equals(p.getProductAvailable()), p.getPrice(),
                            s == null || s.getUnits() == null ? 0 : s.getUnits(), stock <= threshold);
                })
                .sorted(Comparator.comparing(StockRow::category).thenComparing(StockRow::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /** Sets the stock to an exact number (a stock take or a restock). The product is available while stock is above zero. */
    @Transactional
    public StockRow updateStock(int productId, int quantity) {
        Product product = productRepo.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product " + productId + " not found"));
        product.setStockQuantity(quantity);
        product.setProductAvailable(quantity > 0);
        notifications.stockChecked(product);
        events.publishEvent(new VectorUpsertEvent(
                VectorDocs.productFilter(product.getId()),
                VectorDocs.productContent(product),
                VectorDocs.productMetadata(product.getId())));
        int threshold = notifications.lowStockThreshold();
        long sold = orderRepo.productSales(OrderStatus.CANCELLED).stream()
                .filter(s -> s.getProductId() == productId).mapToLong(ProductSales::getUnits).sum();
        return new StockRow(product.getId(), product.getName(), product.getBrand(),
                product.getCategory() == null ? "Other" : product.getCategory(), quantity,
                product.isProductAvailable(), product.getPrice(), sold, quantity <= threshold);
    }

    @Transactional(readOnly = true)
    public List<CustomerRow> customers() {
        Map<Long, CustomerStats> stats = orderRepo.customerStats(OrderStatus.CANCELLED).stream()
                .collect(Collectors.toMap(CustomerStats::getUserId, Function.identity()));
        List<CustomerRow> rows = new ArrayList<>();
        for (AppUser u : userRepo.findByRoleOrderByCreatedAtDesc(Role.USER)) {
            CustomerStats s = stats.get(u.getId());
            rows.add(new CustomerRow(u.getId(), u.getFullName(), u.getEmail(), u.getCreatedAt(),
                    s == null ? 0 : s.getCnt(), s == null ? BigDecimal.ZERO : orZero(s.getSpent()),
                    s == null ? null : s.getLastOrder()));
        }
        return rows;
    }

    /** Facts the dashboard (and the AI summary) should draw attention to. Computed in code, never guessed by the model. */
    @Transactional(readOnly = true)
    public List<String> alerts() {
        List<String> alerts = new ArrayList<>();
        int threshold = notifications.lowStockThreshold();
        for (ProductStockView p : productRepo.findAllProjectedBy()) {
            int stock = p.getStockQuantity() == null ? 0 : p.getStockQuantity();
            if (stock <= 0) {
                alerts.add(p.getName() + " is out of stock");
            } else if (stock <= threshold) {
                alerts.add(p.getName() + " has only " + stock + " left");
            }
        }
        List<OrderSummaryView> stalled = orderRepo.findByStatusInAndOrderDateBefore(
                EnumSet.of(OrderStatus.PLACED, OrderStatus.CONFIRMED), LocalDate.now().minusDays(STALLED_ORDER_DAYS));
        if (!stalled.isEmpty()) {
            alerts.add(stalled.size() + " order(s) have waited more than " + STALLED_ORDER_DAYS
                    + " days without shipping: " + stalled.stream().limit(5).map(OrderSummaryView::getOrderId)
                    .collect(Collectors.joining(", ")));
        }
        long unpaid = orderRepo.countByStatusAndPaymentStatus(OrderStatus.DELIVERED, PaymentStatus.PENDING);
        if (unpaid > 0) {
            alerts.add(unpaid + " delivered order(s) still show the payment as pending");
        }
        long slow = orderRepo.countByStatusAndShippedAtBefore(OrderStatus.SHIPPED,
                LocalDateTime.now().minusDays(SLOW_SHIPMENT_DAYS));
        if (slow > 0) {
            alerts.add(slow + " order(s) were shipped more than " + SLOW_SHIPMENT_DAYS + " days ago and are not delivered");
        }
        return alerts;
    }

    private static Map<String, Long> toMap(List<KeyCount> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (KeyCount row : rows) {
            map.merge(row.getGrp() == null ? "NOT_RECORDED" : row.getGrp().toString(), row.getCnt(), Long::sum);
        }
        return map;
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
