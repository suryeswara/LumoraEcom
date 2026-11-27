package com.lumora.shop.service;

import com.lumora.shop.model.dto.GeneratedProductResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductDraftNormalizerTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 16);

    private static GeneratedProductResponse raw(String name, String brand, String desc, BigDecimal price,
                                                String category, Integer stock, String date, Boolean avail) {
        return new GeneratedProductResponse(name, brand, desc, price, category, stock, date, avail);
    }

    @Test
    void validDraftPassesThroughCleaned() {
        var out = ProductDraftNormalizer.normalize(
                raw("  Gaming Laptop ", " Zenith ", "Fast.", new BigDecimal("89999.5"),
                        "laptop", 25, "2026-12-01", true), TODAY);
        assertThat(out.name()).isEqualTo("Gaming Laptop");
        assertThat(out.brand()).isEqualTo("Zenith");
        assertThat(out.price()).isEqualByComparingTo("89999.50");
        assertThat(out.category()).isEqualTo("Laptop");          // case-insensitive match
        assertThat(out.stockQuantity()).isEqualTo(25);
        assertThat(out.releaseDate()).isEqualTo("2026-12-01");
        assertThat(out.productAvailable()).isTrue();
    }

    @Test
    void unknownCategoryFallsBackToOther() {
        var out = ProductDraftNormalizer.normalize(
                raw("X", "B", "d", BigDecimal.ONE, "Furniture", 5, "2026-01-01", true), TODAY);
        assertThat(out.category()).isEqualTo("Other");
    }

    @Test
    void badOrMissingDateFallsBackToToday() {
        assertThat(ProductDraftNormalizer.normalize(
                raw("X", "B", "d", BigDecimal.ONE, "Toys", 5, "next friday", true), TODAY)
                .releaseDate()).isEqualTo("2026-11-16");
        assertThat(ProductDraftNormalizer.normalize(
                raw("X", "B", "d", BigDecimal.ONE, "Toys", 5, null, true), TODAY)
                .releaseDate()).isEqualTo("2026-11-16");
    }

    @Test
    void negativeValuesAreClampedAndZeroStockMeansUnavailable() {
        var out = ProductDraftNormalizer.normalize(
                raw("X", "B", "d", new BigDecimal("-5"), "Toys", -3, "2026-01-01", true), TODAY);
        assertThat(out.price()).isEqualByComparingTo("0.00");
        assertThat(out.stockQuantity()).isZero();
        assertThat(out.productAvailable()).isFalse();
    }

    @Test
    void missingOptionalFieldsGetDefaults() {
        var out = ProductDraftNormalizer.normalize(
                raw("X", null, null, null, null, null, null, null), TODAY);
        assertThat(out.brand()).isEqualTo("Generic");
        assertThat(out.description()).isEmpty();
        assertThat(out.category()).isEqualTo("Other");
    }

    @Test
    void longDescriptionIsTruncated() {
        var out = ProductDraftNormalizer.normalize(
                raw("X", "B", "a".repeat(900), BigDecimal.ONE, "Toys", 5, "2026-01-01", true), TODAY);
        assertThat(out.description()).hasSize(ProductDraftNormalizer.MAX_DESCRIPTION_LENGTH);
    }

    @Test
    void missingNameIsRejected() {
        assertThatThrownBy(() -> ProductDraftNormalizer.normalize(
                raw("  ", "B", "d", BigDecimal.ONE, "Toys", 5, "2026-01-01", true), TODAY))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> ProductDraftNormalizer.normalize(null, TODAY))
                .isInstanceOf(IllegalStateException.class);
    }
}
