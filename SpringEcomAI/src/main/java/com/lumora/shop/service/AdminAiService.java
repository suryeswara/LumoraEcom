package com.lumora.shop.service;

import com.lumora.shop.model.OrderStatus;
import com.lumora.shop.model.dto.AdminDtos.AiAnswer;
import com.lumora.shop.model.dto.AdminDtos.Dashboard;
import com.lumora.shop.model.dto.AdminDtos.StockRow;
import com.lumora.shop.model.dto.AdminDtos.TopProduct;
import com.lumora.shop.repo.OrderRepo;
import com.lumora.shop.repo.Projections.OrderSummaryView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Lets an admin ask questions about products, orders, stock and payments.
 * The numbers are read from PostgreSQL by AdminService and OrderRepo and handed to the model as a text snapshot,
 * so the model explains real data instead of inventing it. The snapshot holds no customer names, emails,
 * phone numbers or addresses: it is sent to a third-party AI provider.
 */
@Service
public class AdminAiService {

    private static final Logger log = LoggerFactory.getLogger(AdminAiService.class);
    static final String DEFAULT_QUESTION =
            "Give me a short briefing for today: what needs my attention first across orders, payments and stock?";

    private final ChatClient chatClient;
    private final ResourceLoader resourceLoader;
    private final AdminService adminService;
    private final OrderRepo orderRepo;

    public AdminAiService(ChatClient chatClient, ResourceLoader resourceLoader,
                          AdminService adminService, OrderRepo orderRepo) {
        this.chatClient = chatClient;
        this.resourceLoader = resourceLoader;
        this.adminService = adminService;
        this.orderRepo = orderRepo;
    }

    // No @Transactional here: the slow AI call must not hold a database connection.
    public AiAnswer ask(String question) {
        String q = question == null || question.isBlank() ? DEFAULT_QUESTION : question.trim();
        List<String> alerts = adminService.alerts();
        try {
            String template = resourceLoader.getResource("classpath:prompts/admin-insights-prompt.st")
                    .getContentAsString(StandardCharsets.UTF_8);
            PromptTemplate prompt = PromptTemplate.builder()
                    .template(template)
                    .variables(Map.of("context", snapshot(alerts), "question", q))
                    .build();
            String answer = chatClient.prompt(prompt.create()).call().content();
            return new AiAnswer(answer, alerts, true);
        } catch (IOException | RuntimeException e) {
            // Provider down, quota used up or no API key: the code-computed alerts are still useful.
            log.warn("Admin AI request failed: {}", e.toString());
            return new AiAnswer("The AI assistant is not available right now. The alerts below come straight from your data.",
                    alerts, false);
        }
    }

    String snapshot(List<String> alerts) {
        Dashboard d = adminService.dashboard();
        StringBuilder sb = new StringBuilder();
        sb.append("Currency: INR\n");
        sb.append("Orders in total: ").append(d.totalOrders()).append("\n");
        sb.append("Orders by status: ").append(d.ordersByStatus()).append("\n");
        sb.append("Orders by payment status (cancelled orders excluded): ").append(d.ordersByPaymentStatus()).append("\n");
        sb.append("Money received (paid orders): ").append(d.revenue()).append("\n");
        sb.append("Money still pending: ").append(d.pendingPayments()).append("\n");
        sb.append("Customers: ").append(d.totalCustomers()).append(", products: ").append(d.totalProducts())
                .append(", units ordered (cancelled excluded): ").append(d.unitsOrdered()).append("\n");
        sb.append("Products per category: ").append(d.productsByCategory()).append("\n");

        sb.append("\nLow stock threshold: ").append(d.lowStockThreshold()).append(" units\n");
        sb.append("Products at or below the threshold:\n");
        if (d.lowStock().isEmpty()) sb.append("- none\n");
        for (StockRow r : d.lowStock()) {
            sb.append("- ").append(r.name()).append(" (").append(r.category()).append("): ")
                    .append(r.stockQuantity()).append(" in stock, ").append(r.unitsSold()).append(" sold so far\n");
        }

        sb.append("\nBest selling products:\n");
        if (d.topProducts().isEmpty()) sb.append("- no sales yet\n");
        for (TopProduct t : d.topProducts()) {
            sb.append("- ").append(t.name()).append(": ").append(t.unitsSold()).append(" units, revenue ")
                    .append(t.revenue()).append("\n");
        }

        sb.append("\nLatest orders (id | date | status | payment method | payment status | total):\n");
        for (OrderSummaryView o : orderRepo.findTop25ByOrderByIdDesc()) {
            sb.append("- ").append(o.getOrderId()).append(" | ").append(o.getOrderDate()).append(" | ")
                    .append(o.getStatus()).append(" | ").append(o.getPaymentMethod() == null ? "not recorded" : o.getPaymentMethod())
                    .append(" | ").append(o.getPaymentStatus() == null ? "not recorded" : o.getPaymentStatus())
                    .append(" | ").append(o.getTotalAmount()).append("\n");
        }

        sb.append("\nAlerts found by the system:\n");
        if (alerts.isEmpty()) sb.append("- none\n");
        alerts.forEach(a -> sb.append("- ").append(a).append("\n"));
        return sb.toString();
    }
}
