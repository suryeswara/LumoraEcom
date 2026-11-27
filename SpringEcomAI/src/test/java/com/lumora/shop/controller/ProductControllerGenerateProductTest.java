package com.lumora.shop.controller;

import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.GeneratedProductResponse;
import com.lumora.shop.security.JwtService;
import com.lumora.shop.security.SecurityConfig;
import com.lumora.shop.service.ProductGenerationService;
import com.lumora.shop.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web-layer slice: no DB, no OpenAI. The endpoint is ADMIN-only, so requests carry an admin JWT. */
@WebMvcTest(ProductController.class)
@Import({SecurityConfig.class, JwtService.class})
class ProductControllerGenerateProductTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @MockitoBean ProductService productService;
    @MockitoBean ProductGenerationService productGenerationService;

    private String admin() {
        return "Bearer " + jwtService.generateToken("admin@shop.test", Role.ADMIN);
    }

    @Test
    void returns200WithDraftJson() throws Exception {
        when(productGenerationService.generateProduct("gaming laptop")).thenReturn(
                new GeneratedProductResponse("Gaming Laptop", "Zenith", "Fast", new BigDecimal("89999.00"),
                        "Laptop", 25, "2026-12-01", true));

        mockMvc.perform(post("/api/product/generate-product").param("query", "gaming laptop")
                        .header("Authorization", admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Gaming Laptop"))
                .andExpect(jsonPath("$.category").value("Laptop"))
                .andExpect(jsonPath("$.stockQuantity").value(25))
                .andExpect(jsonPath("$.releaseDate").value("2026-12-01"))
                .andExpect(jsonPath("$.productAvailable").value(true));
    }

    @Test
    void returns400ForInvalidInput() throws Exception {
        when(productGenerationService.generateProduct(anyString()))
                .thenThrow(new IllegalArgumentException("Product description must not be blank"));

        mockMvc.perform(post("/api/product/generate-product").param("query", " ")
                        .header("Authorization", admin()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Product description must not be blank"));
    }

    @Test
    void returns502WithoutLeakingProviderDetailsWhenAiFails() throws Exception {
        when(productGenerationService.generateProduct(anyString()))
                .thenThrow(new RuntimeException("401 invalid api key sk-secret"));

        mockMvc.perform(post("/api/product/generate-product").param("query", "phone")
                        .header("Authorization", admin()))
                .andExpect(status().isBadGateway())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("sk-secret"))));
    }

    @Test
    void returns400WhenQueryParamMissing() throws Exception {
        mockMvc.perform(post("/api/product/generate-product").header("Authorization", admin()))
                .andExpect(status().isBadRequest());
    }
}
