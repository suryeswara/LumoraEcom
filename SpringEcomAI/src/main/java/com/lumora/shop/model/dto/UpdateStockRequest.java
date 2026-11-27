package com.lumora.shop.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateStockRequest(
        @NotNull(message = "Stock is required") @Min(value = 0, message = "Stock cannot be negative")
        @Max(value = 1_000_000, message = "Stock is too large") Integer stockQuantity
) {}
