package com.lumora.shop.config;

import com.lumora.shop.model.Order;
import com.lumora.shop.model.OrderItem;
import com.lumora.shop.repo.OrderRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Orders created before totalAmount existed get it computed from their lines, so revenue and customer totals
 * in the admin dashboard are complete. Payment and shipment fields are NOT guessed: they stay empty.
 */
@Component
public class LegacyOrderBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyOrderBackfill.class);
    private final OrderRepo orderRepo;

    public LegacyOrderBackfill(OrderRepo orderRepo) {
        this.orderRepo = orderRepo;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Order> legacy = orderRepo.findByTotalAmountIsNull();
        for (Order order : legacy) {
            order.setTotalAmount(order.getItems().stream().map(OrderItem::getTotalPrice)
                    .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
        }
        if (!legacy.isEmpty()) {
            log.info("Filled totalAmount for {} older order(s)", legacy.size());
        }
    }
}
