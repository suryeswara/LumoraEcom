package com.lumora.shop.security;

import com.lumora.shop.controller.AdminDashboardController;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.AdminDtos.AiAnswer;
import com.lumora.shop.service.AdminAiService;
import com.lumora.shop.service.AdminService;
import com.lumora.shop.service.NotificationService;
import com.lumora.shop.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admin dashboard, stock, notification and AI endpoints: admins only, and input is validated. */
@WebMvcTest(controllers = AdminDashboardController.class)
@Import({SecurityConfig.class, JwtService.class})
class AdminDashboardSecurityTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockitoBean AdminService adminService;
    @MockitoBean NotificationService notificationService;
    @MockitoBean OrderService orderService;
    @MockitoBean AdminAiService adminAiService;

    private String bearer(Role role) {
        return "Bearer " + jwt.generateToken("someone@shop.test", role);
    }

    @Test
    void dashboard_needsAnAdmin() throws Exception {
        mvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(Role.USER))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(Role.ADMIN))).andExpect(status().isOk());
    }

    @Test
    void customersNotificationsAndAi_areHiddenFromCustomers() throws Exception {
        mvc.perform(get("/api/admin/customers").header("Authorization", bearer(Role.USER))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/notifications").header("Authorization", bearer(Role.USER))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/ai/insights").header("Authorization", bearer(Role.USER))).andExpect(status().isForbidden());
    }

    @Test
    void updateStock_rejectsNegativeNumbers_andIsAdminOnly() throws Exception {
        mvc.perform(patch("/api/admin/products/5/stock").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stockQuantity\":4}").header("Authorization", bearer(Role.USER)))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/products/5/stock").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stockQuantity\":-1}").header("Authorization", bearer(Role.ADMIN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.stockQuantity").exists());
        verify(adminService, never()).updateStock(org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void aiAsk_returnsTheAnswer_andRejectsAnEmptyQuestion() throws Exception {
        when(adminAiService.ask(any())).thenReturn(new AiAnswer("All good", List.of("Laptop has only 2 left"), true));
        mvc.perform(post("/api/admin/ai/ask").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"What is low on stock?\"}").header("Authorization", bearer(Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("All good"))
                .andExpect(jsonPath("$.alerts[0]").value("Laptop has only 2 left"));
        mvc.perform(post("/api/admin/ai/ask").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"\"}").header("Authorization", bearer(Role.ADMIN)))
                .andExpect(status().isBadRequest());
    }
}
