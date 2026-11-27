package com.lumora.shop.service;

import com.lumora.shop.model.dto.GeneratedProductResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Pure-Java validation of LLM output. An LLM is not a trusted source: this class
 * guarantees the draft always fits the form (allowed category, ISO date, sane numbers).
 */
public final class ProductDraftNormalizer {

    /** Must stay in sync with the category <select> in AddProduct.jsx. */
    public static final List<String> CATEGORIES =
            List.of("Laptop", "Headphone", "Mobile", "Electronics", "Toys", "Fashion", "Other");

    static final int MAX_DESCRIPTION_LENGTH = 500;
    static final String DEFAULT_BRAND = "Generic";

    private ProductDraftNormalizer() {}

    public static GeneratedProductResponse normalize(GeneratedProductResponse raw, LocalDate today) {
        if (raw == null || isBlank(raw.name())) {
            throw new IllegalStateException("AI response did not contain a product name");
        }

        int stock = raw.stockQuantity() == null ? 0 : Math.max(0, raw.stockQuantity());

        BigDecimal price = (raw.price() == null || raw.price().signum() < 0)
                ? BigDecimal.ZERO : raw.price();
        price = price.setScale(2, RoundingMode.HALF_UP);

        boolean available = stock > 0 && !Boolean.FALSE.equals(raw.productAvailable());

        return new GeneratedProductResponse(
                raw.name().trim(),
                isBlank(raw.brand()) ? DEFAULT_BRAND : raw.brand().trim(),
                truncate(raw.description()),
                price,
                matchCategory(raw.category()),
                stock,
                parseDate(raw.releaseDate(), today),
                available
        );
    }

    static String matchCategory(String category) {
        if (category == null) return "Other";
        String c = category.trim();
        return CATEGORIES.stream().filter(x -> x.equalsIgnoreCase(c)).findFirst().orElse("Other");
    }

    static String parseDate(String value, LocalDate fallback) {
        if (value == null) return fallback.toString();
        try {
            return LocalDate.parse(value.trim()).toString();
        } catch (DateTimeParseException e) {
            return fallback.toString();
        }
    }

    static String truncate(String description) {
        if (description == null) return "";
        String d = description.trim();
        return d.length() <= MAX_DESCRIPTION_LENGTH ? d : d.substring(0, MAX_DESCRIPTION_LENGTH).trim();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
