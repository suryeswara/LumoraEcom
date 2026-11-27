package com.lumora.shop.model.dto;

import com.lumora.shop.model.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** carrier and trackingNumber are only used when the new status is SHIPPED. */
public record UpdateOrderStatusRequest(
        @NotNull(message = "Status is required") OrderStatus status,
        @Size(max = 100) String carrier,
        @Size(max = 100) String trackingNumber
) {
    public UpdateOrderStatusRequest(OrderStatus status) {
        this(status, null, null);
    }
}
