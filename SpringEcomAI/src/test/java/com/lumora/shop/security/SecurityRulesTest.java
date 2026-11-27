package com.lumora.shop.security;

import com.lumora.shop.controller.AdminController;
import com.lumora.shop.controller.ChatBotController;
import com.lumora.shop.controller.OrderController;
import com.lumora.shop.controller.ProductController;
import com.lumora.shop.exception.InsufficientStockException;
import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.Product;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.OrderResponse;
import com.lumora.shop.service.ChatBotService;
import com.lumora.shop.service.OrderService;
import com.lumora.shop.service.ProductGenerationService;
import com.lumora.shop.service.ProductService;
import com.lumora.shop.vector.ReindexResult;
import com.lumora.shop.vector.VectorIndexService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Verifies who may call what, plus request validation and error mapping, without a database or OpenAI. */
@WebMvcTest(controllers = {ProductController.class, OrderController.class, ChatBotController.class, AdminController.class})
@Import({SecurityConfig.class, JwtService.class})
class SecurityRulesTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockitoBean ProductService productService;
    @MockitoBean ProductGenerationService productGenerationService;
    @MockitoBean OrderService orderService;
    @MockitoBean ChatBotService chatBotService;
    @MockitoBean VectorIndexService vectorIndexService;

    private String bearer(String email, Role role) {
        return "Bearer " + jwt.generateToken(email, role);
    }

    private static OrderResponse orderResponse(String status) {
        return new OrderResponse("ORD1", "Asha", "asha@x.com", status, LocalDate.of(2026, 11, 17), List.of());
    }

    // ---------- products need a login ----------
    @Test
    void browsingProducts_requiresLogin() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/product/5")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/product/5/image")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/products/smart-search").param("query", "laptop")).andExpect(status().isUnauthorized());
    }

    @Test
    void loggedInCustomersAndAdminsCanBrowseProducts() throws Exception {
        mvc.perform(get("/api/products").header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/products").header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isOk());
    }

    // ---------- ADMIN-only catalog management ----------
    @Test
    void deleteProduct_anonymous_is401() throws Exception {
        mvc.perform(delete("/api/product/5"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void deleteProduct_user_is403() throws Exception {
        mvc.perform(delete("/api/product/5").header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isForbidden());
        verify(productService, never()).deleteProduct(5);
    }

    @Test
    void deleteProduct_admin_reachesController() throws Exception {
        // mocked service returns null for the lookup, so the controller answers 404 = it WAS reached
        mvc.perform(delete("/api/product/5").header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aiGeneration_isAdminOnly() throws Exception {
        mvc.perform(post("/api/product/generate-description").param("name", "x").param("category", "Toys"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/product/generate-description").param("name", "x").param("category", "Toys")
                        .header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isForbidden());
    }

    // ---------- orders ----------
    @Test
    void orders_anonymous_is401() throws Exception {
        mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
    }

    @Test
    void orders_user_getsOnlyOwnOrders() throws Exception {
        mvc.perform(get("/api/orders").header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isOk());
        verify(orderService).getOrderResponsesForUser("u@shop.test");
        verify(orderService, never()).getAllOrderResponses();
    }

    @Test
    void orders_admin_getsAllOrders() throws Exception {
        mvc.perform(get("/api/orders").header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isOk());
        verify(orderService).getAllOrderResponses();
    }

    @Test
    void placeOrder_usesTheEmailFromTheToken() throws Exception {
        when(orderService.placeOrder(any(), eq("u@shop.test"))).thenReturn(orderResponse("PLACED"));
        mvc.perform(post("/api/orders/place").header("Authorization", bearer("u@shop.test", Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Asha\",\"email\":\"asha@x.com\",\"shippingAddress\":\"12 MG Road, Pune\",\"phone\":\"9876543210\",\"items\":[{\"productId\":5,\"quantity\":2}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("ORD1"));
    }

    @Test
    void placeOrder_isForCustomersOnly_anAdminGetsForbidden() throws Exception {
        mvc.perform(post("/api/orders/place").header("Authorization", bearer("a@shop.test", Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"A\",\"email\":\"a@x.com\",\"shippingAddress\":\"1 Road\",\"phone\":\"9876543210\","
                                + "\"items\":[{\"productId\":5,\"quantity\":1}]}"))
                .andExpect(status().isForbidden());
        verify(orderService, never()).placeOrder(any(), any());
    }

    @Test
    void placeOrder_withoutDeliveryDetails_is400() throws Exception {
        mvc.perform(post("/api/orders/place").header("Authorization", bearer("u@shop.test", Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"A\",\"email\":\"a@x.com\",\"items\":[{\"productId\":5,\"quantity\":1}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.shippingAddress").exists())
                .andExpect(jsonPath("$.fields.phone").exists());
    }

    @Test
    void placeOrder_invalidBody_is400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/orders/place").header("Authorization", bearer("u@shop.test", Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"\",\"email\":\"not-an-email\",\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.fields.customerName").exists())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.items").exists());
        verify(orderService, never()).placeOrder(any(), any());
    }

    @Test
    void placeOrder_zeroQuantity_is400() throws Exception {
        mvc.perform(post("/api/orders/place").header("Authorization", bearer("u@shop.test", Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"A\",\"email\":\"a@x.com\",\"items\":[{\"productId\":5,\"quantity\":0}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void placeOrder_insufficientStock_is409WithReadableMessage() throws Exception {
        when(orderService.placeOrder(any(), any()))
                .thenThrow(new InsufficientStockException("Insufficient stock for Laptop (available: 1, requested: 3)"));
        mvc.perform(post("/api/orders/place").header("Authorization", bearer("u@shop.test", Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"A\",\"email\":\"a@x.com\",\"shippingAddress\":\"12 MG Road, Pune\",\"phone\":\"9876543210\",\"items\":[{\"productId\":5,\"quantity\":3}]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Insufficient stock for Laptop (available: 1, requested: 3)"));
    }

    @Test
    void cancelOrder_requiresLogin_andUsesTheCallersIdentity() throws Exception {
        mvc.perform(post("/api/orders/ORD1/cancel")).andExpect(status().isUnauthorized());

        when(orderService.cancelOrder("ORD1", "u@shop.test", false)).thenReturn(orderResponse("CANCELLED"));
        mvc.perform(post("/api/orders/ORD1/cancel").header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void updateStatus_isAdminOnly() throws Exception {
        String body = "{\"status\":\"SHIPPED\"}";
        mvc.perform(patch("/api/orders/ORD1/status").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/orders/ORD1/status").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isForbidden());

        when(orderService.updateStatus("ORD1", OrderStatus.SHIPPED, null, null)).thenReturn(orderResponse("SHIPPED"));
        mvc.perform(patch("/api/orders/ORD1/status").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));
    }

    @Test
    void updateStatus_unknownStatusValue_is400() throws Exception {
        mvc.perform(patch("/api/orders/ORD1/status").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"TELEPORTED\"}")
                        .header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isBadRequest());
    }

    // ---------- product creation: the photo is optional ----------
    @Test
    void addProduct_withoutPhoto_isAccepted() throws Exception {
        Product saved = new Product();
        saved.setId(9);
        saved.setName("Mug");
        when(productService.addOrUpdateProduct(any(Product.class), isNull())).thenReturn(saved);

        mvc.perform(multipart("/api/product")
                        .file(new MockMultipartFile("product", "", "application/json",
                                "{\"name\":\"Mug\",\"price\":199,\"stockQuantity\":5,\"category\":\"Other\"}".getBytes()))
                        .header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(9));
    }

    @Test
    void addProduct_withBlankName_is400WithFieldError() throws Exception {
        mvc.perform(multipart("/api/product")
                        .file(new MockMultipartFile("product", "", "application/json",
                                "{\"name\":\"\",\"price\":199,\"stockQuantity\":5}".getBytes()))
                        .header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists());
        verify(productService, never()).addOrUpdateProduct(any(), any());
    }

    // ---------- maintenance ----------
    @Test
    void reindex_isAdminOnly() throws Exception {
        mvc.perform(post("/api/admin/reindex").header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isForbidden());

        when(vectorIndexService.reindexAll()).thenReturn(new ReindexResult(2, 1));
        mvc.perform(post("/api/admin/reindex").header("Authorization", bearer("a@shop.test", Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products").value(2))
                .andExpect(jsonPath("$.orders").value(1));
    }

    // ---------- chatbot ----------
    @Test
    void chatbot_requiresLogin_andIsScopedToTheCaller() throws Exception {
        mvc.perform(get("/api/chat/ask").param("message", "hi")).andExpect(status().isUnauthorized());

        mvc.perform(get("/api/chat/ask").param("message", "hi")
                        .header("Authorization", bearer("u@shop.test", Role.USER)))
                .andExpect(status().isOk());
        verify(chatBotService).getBotResponse("hi", "u@shop.test");
    }

    // ---------- token tampering ----------
    @Test
    void tokenSignedWithAnotherKey_isRejected() throws Exception {
        String forged = "Bearer " + new JwtService("", 3_600_000).generateToken("a@shop.test", Role.ADMIN);
        mvc.perform(delete("/api/product/5").header("Authorization", forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void garbageToken_isRejected() throws Exception {
        mvc.perform(get("/api/orders").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void payloadTamperedToken_isRejected() throws Exception {
        String[] parts = jwt.generateToken("u@shop.test", Role.USER).split("\\.");
        String adminPayload = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"sub\":\"u@shop.test\",\"role\":\"ADMIN\",\"exp\":9999999999}".getBytes());
        String tampered = "Bearer " + parts[0] + "." + adminPayload + "." + parts[2];
        mvc.perform(delete("/api/product/5").header("Authorization", tampered))
                .andExpect(status().isUnauthorized());
    }

    // ---------- CORS ----------
    @Test
    void cors_allowsConfiguredOriginOnly() throws Exception {
        mvc.perform(options("/api/products")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(options("/api/products")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
