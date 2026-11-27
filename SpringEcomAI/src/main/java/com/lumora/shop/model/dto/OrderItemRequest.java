package com.lumora.shop.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;

public record OrderItemRequest(
        @Positive(message = "Invalid product") int productId,
        @Positive(message = "Quantity must be at least 1") @Max(value = 1000, message = "Quantity is too large") int quantity
) {}
