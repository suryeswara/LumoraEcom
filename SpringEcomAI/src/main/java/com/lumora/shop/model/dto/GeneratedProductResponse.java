package com.lumora.shop.model.dto;

import java.math.BigDecimal;

/**
 * Draft product produced by the AI (and cleaned by ProductDraftNormalizer).
 * It is NOT persisted: the frontend uses it to pre-fill the "Add Product" form.
 * Boxed types are used because the LLM may omit fields.
 */
public record GeneratedProductResponse(
        String name,
        String brand,
        String description,
        BigDecimal price,
        String category,
        Integer stockQuantity,
        String releaseDate,      // ISO yyyy-MM-dd, matches <input type="date">
        Boolean productAvailable
) {}
