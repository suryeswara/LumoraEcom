package com.lumora.shop.service;

import com.lumora.shop.model.dto.GeneratedProductResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/**
 * Turns a free-text seller request into a structured product draft using the LLM.
 * Structured output: ChatClient.entity() asks the model for JSON matching the record
 * and deserialises it (Spring AI BeanOutputConverter under the hood).
 */
@Service
public class ProductGenerationService {

    static final int MAX_QUERY_LENGTH = 1000;

    private final ChatClient chatClient;
    private final Resource promptTemplate;

    public ProductGenerationService(
            ChatClient chatClient,
            @Value("classpath:prompts/product-generate-prompt.st") Resource promptTemplate) {
        this.chatClient = chatClient;
        this.promptTemplate = promptTemplate;
    }

    public GeneratedProductResponse generateProduct(String query) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Product description must not be blank");
        }
        String request = query.trim();
        if (request.length() > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException(
                    "Product description must be at most " + MAX_QUERY_LENGTH + " characters");
        }

        String template = readTemplate();
        LocalDate today = LocalDate.now();

        GeneratedProductResponse raw = chatClient.prompt()
                .user(u -> u.text(template)
                        .param("query", request)
                        .param("categories", String.join(", ", ProductDraftNormalizer.CATEGORIES))
                        .param("today", today.toString()))
                .call()
                .entity(GeneratedProductResponse.class);

        return ProductDraftNormalizer.normalize(raw, today);
    }

    // Resource#getContentAsString works inside a packaged JAR (unlike Resource#getFile).
    private String readTemplate() {
        try {
            return promptTemplate.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read product-generate prompt template", e);
        }
    }
}
