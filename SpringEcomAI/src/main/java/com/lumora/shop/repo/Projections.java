package com.lumora.shop.repo;

import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.PaymentMethod;
import com.lumora.shop.model.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Closed interface projections: Spring Data selects only these columns, so admin lists never pull
 * the (large) product image column into memory.
 */
public final class Projections {

    private Projections() {}

    public interface ProductStockView {
        Integer getId();
        String getName();
        String getBrand();
        String getCategory();
        Integer getStockQuantity();
        Boolean getProductAvailable();
        BigDecimal getPrice();
    }

    public interface OrderSummaryView {
        String getOrderId();
        LocalDate getOrderDate();
        OrderStatus getStatus();
        PaymentMethod getPaymentMethod();
        PaymentStatus getPaymentStatus();
        BigDecimal getTotalAmount();
    }

    public interface KeyCount {
        Object getGrp();
        Long getCnt();
    }

    public interface ProductSales {
        Integer getProductId();
        String getName();
        Long getUnits();
        BigDecimal getRevenue();
    }

    public interface CustomerStats {
        Long getUserId();
        Long getCnt();
        BigDecimal getSpent();
        LocalDate getLastOrder();
    }
}
