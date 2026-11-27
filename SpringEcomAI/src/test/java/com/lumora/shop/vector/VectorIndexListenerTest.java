package com.lumora.shop.vector;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.ai.vectorstore.VectorStore;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class VectorIndexListenerTest {

    private final VectorStore vectorStore = mock(VectorStore.class);
    private final VectorIndexListener listener = new VectorIndexListener(vectorStore);

    @Test
    void upsertRemovesOldEmbeddingBeforeAddingTheNewOne() {
        listener.onUpsert(new VectorUpsertEvent("productId == '5'", "Product Name: X",
                Map.of("type", "product", "productId", "5")));

        InOrder order = inOrder(vectorStore);
        order.verify(vectorStore).delete("productId == '5'");
        order.verify(vectorStore).add(anyList());
    }

    @Test
    void deleteEventRemovesTheEmbedding() {
        listener.onDelete(new VectorDeleteEvent("productId == '5'"));
        verify(vectorStore).delete("productId == '5'");
        verify(vectorStore, never()).add(anyList());
    }

    @Test
    void indexFailureNeverBreaksTheCallerBecauseTheDatabaseIsTheSourceOfTruth() {
        doThrow(new RuntimeException("embedding API down")).when(vectorStore).add(anyList());
        assertThatCode(() -> listener.onUpsert(new VectorUpsertEvent("orderId == 'ORD1'", "x", Map.of())))
                .doesNotThrowAnyException();
    }
}
