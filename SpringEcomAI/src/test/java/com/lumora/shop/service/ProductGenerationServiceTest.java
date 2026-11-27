package com.lumora.shop.service;

import com.lumora.shop.model.dto.GeneratedProductResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ByteArrayResource;

import java.math.BigDecimal;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** No OpenAI call is made: ChatClient is mocked, so this tests OUR logic only. */
class ProductGenerationServiceTest {

    private final ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final ProductGenerationService service = new ProductGenerationService(
            chatClient, new ByteArrayResource("Request: {query} {categories} {today}".getBytes()));

    @Test
    void returnsNormalizedDraftFromModelOutput() {
        var fromModel = new GeneratedProductResponse("Phone", "Acme", "Nice", new BigDecimal("999"),
                "smartphones", 40, "garbage-date", true);
        when(chatClient.prompt()
                .user(ArgumentMatchers.<Consumer<ChatClient.PromptUserSpec>>any())
                .call()
                .entity(GeneratedProductResponse.class)).thenReturn(fromModel);

        var out = service.generateProduct("  a cheap phone  ");

        assertThat(out.category()).isEqualTo("Other");     // "smartphones" not an allowed category
        assertThat(out.releaseDate()).matches("\\d{4}-\\d{2}-\\d{2}");
        assertThat(out.price()).isEqualByComparingTo("999.00");
    }

    @Test
    void blankQueryIsRejectedWithoutCallingTheModel() {
        assertThatThrownBy(() -> service.generateProduct("   "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.generateProduct(null))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(chatClient);
    }

    @Test
    void overlongQueryIsRejected() {
        assertThatThrownBy(() -> service.generateProduct("x".repeat(ProductGenerationService.MAX_QUERY_LENGTH + 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
