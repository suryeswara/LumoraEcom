package com.lumora.shop.vector;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.UUID;

/**
 * Keeps the vector store in sync with the relational DB WITHOUT holding a DB transaction open during slow
 * embedding calls: services publish events inside their transaction; these handlers run only after a successful
 * COMMIT (a rolled-back order never reaches the index). If the index update fails, the order/product is still
 * saved (the DB is the source of truth) and POST /api/admin/reindex repairs the index.
 */
@Component
public class VectorIndexListener {

    private static final Logger log = LoggerFactory.getLogger(VectorIndexListener.class);

    private final VectorStore vectorStore;

    public VectorIndexListener(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUpsert(VectorUpsertEvent event) {
        try {
            vectorStore.delete(event.deleteFilter());     // drop the old embedding first: no stale duplicates
            vectorStore.add(List.of(new Document(UUID.randomUUID().toString(), event.content(), event.metadata())));
        } catch (RuntimeException e) {
            log.error("Vector index update failed for [{}]: {}. Run POST /api/admin/reindex to repair.",
                    event.deleteFilter(), e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDelete(VectorDeleteEvent event) {
        try {
            vectorStore.delete(event.deleteFilter());
        } catch (RuntimeException e) {
            log.error("Vector index delete failed for [{}]: {}. Run POST /api/admin/reindex to repair.",
                    event.deleteFilter(), e.getMessage());
        }
    }
}
