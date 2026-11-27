package com.lumora.shop.vector;

import com.lumora.shop.model.Order;
import com.lumora.shop.model.OrderItem;
import com.lumora.shop.model.Product;

import java.util.Map;

/**
 * Single source of truth for what goes into the vector store.
 * Every document carries metadata "type" (product | order) so retrieval can be filtered:
 *  - product search sees only products;
 *  - the chatbot sees products plus ONLY the caller's own orders (metadata "ownerEmail").
 * Customer name/email are deliberately NOT embedded: embeddings are sent to a third party (OpenAI).
 */
public final class VectorDocs {

    public static final String TYPE = "type";
    public static final String TYPE_PRODUCT = "product";
    public static final String TYPE_ORDER = "order";
    public static final String OWNER_EMAIL = "ownerEmail";
    public static final String UNOWNED = "unowned";   // legacy orders created before accounts existed

    private VectorDocs() {}

    public static String productContent(Product p) {
        return String.format("""
                 Product Name: %s
                 Description: %s
                 Brand: %s
                 Category: %s
                 Price: %.2f
                 Release Date: %s
                 Available: %s
                 Stock: %d
                """,
                p.getName(), p.getDescription(), p.getBrand(), p.getCategory(), p.getPrice(),
                p.getReleaseDate(), p.isProductAvailable(), p.getStockQuantity());
    }

    public static Map<String, Object> productMetadata(int productId) {
        return Map.of(TYPE, TYPE_PRODUCT, "productId", String.valueOf(productId));
    }

    public static String productFilter(int productId) {
        return "productId == '" + productId + "'";
    }

    /** Requires order.items and each item's product to be loaded. */
    public static String orderContent(Order o) {
        StringBuilder sb = new StringBuilder();
        sb.append("Order Summary:\n");
        sb.append("Order ID: ").append(o.getOrderId()).append("\n");
        sb.append("Date: ").append(o.getOrderDate()).append("\n");
        sb.append("Status: ").append(o.getStatus()).append("\n");
        if (o.getPaymentMethod() != null) {
            sb.append("Payment: ").append(o.getPaymentMethod()).append(", ").append(o.getPaymentStatus()).append("\n");
        }
        if (o.getTrackingNumber() != null) {
            sb.append("Shipment: ").append(o.getCarrier() == null ? "carrier not given" : o.getCarrier())
                    .append(", tracking ").append(o.getTrackingNumber()).append("\n");
        }
        sb.append("Products:\n");
        for (OrderItem item : o.getItems()) {
            sb.append("- ").append(item.getProduct().getName())
                    .append(" x ").append(item.getQuantity())
                    .append(" = ₹").append(item.getTotalPrice()).append("\n");
        }
        return sb.toString();
    }

    /** Requires order.user to be loaded (null for legacy orders). */
    public static Map<String, Object> orderMetadata(Order o) {
        String owner = o.getUser() != null ? o.getUser().getEmail() : UNOWNED;
        return Map.of(TYPE, TYPE_ORDER, "orderId", o.getOrderId(), OWNER_EMAIL, owner);
    }

    public static String orderFilter(String orderId) {
        return "orderId == '" + orderId + "'";
    }
}
