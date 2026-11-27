package com.lumora.shop.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Data-isolation test: the vector query itself must be restricted to
 * (products) OR (orders owned by the caller). Uses the real prompt file; no OpenAI call.
 */
class ChatBotServiceTest {

    private final ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final VectorStore vectorStore = mock(VectorStore.class);
    private final ChatBotService service = new ChatBotService(chatClient, vectorStore, new DefaultResourceLoader());

    private String filterUsedFor(String email) {
        when(vectorStore.similaritySearch(any(SearchRequest.class)))
                .thenReturn(List.of(new Document("1", "Product Name: X", Map.of())));
        when(chatClient.prompt(any(Prompt.class)).call().content()).thenReturn("reply");

        assertThat(service.getBotResponse("where is my order?", email)).isEqualTo("reply");

        ArgumentCaptor<SearchRequest> captor = ArgumentCaptor.forClass(SearchRequest.class);
        verify(vectorStore).similaritySearch(captor.capture());
        assertThat(captor.getValue().getFilterExpression()).isNotNull();
        return captor.getValue().getFilterExpression().toString();
    }

    @Test
    void retrievalIsScopedToProductsAndTheCallersOwnOrders() {
        String filter = filterUsedFor("alice@shop.test");
        assertThat(filter).contains("product").contains("order").contains("ownerEmail").contains("alice@shop.test");
    }

    @Test
    void anotherUsersEmailNeverAppearsInTheFilter() {
        String filter = filterUsedFor("bob@shop.test");
        assertThat(filter).contains("bob@shop.test").doesNotContain("alice@shop.test");
    }
}
