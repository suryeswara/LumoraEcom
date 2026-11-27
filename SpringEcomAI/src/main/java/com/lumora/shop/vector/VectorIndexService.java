package com.lumora.shop.vector;

import com.lumora.shop.model.Order;
import com.lumora.shop.model.Product;
import com.lumora.shop.repo.OrderRepo;
import com.lumora.shop.repo.ProductRepo;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Rebuilds the whole vector index from the relational DB (the source of truth). Admin maintenance task. */
@Service
public class VectorIndexService {

    private final JdbcTemplate jdbcTemplate;
    private final VectorStore vectorStore;
    private final ProductRepo productRepo;
    private final OrderRepo orderRepo;

    public VectorIndexService(JdbcTemplate jdbcTemplate, VectorStore vectorStore,
                              ProductRepo productRepo, OrderRepo orderRepo) {
        this.jdbcTemplate = jdbcTemplate;
        this.vectorStore = vectorStore;
        this.productRepo = productRepo;
        this.orderRepo = orderRepo;
    }

    /**
     * Wipes vector_store and re-embeds every product and order with the current metadata schema.
     * Use once after upgrading from the old schema (documents without "type"), or to repair drift.
     * Search results are incomplete while it runs.
     */
    public ReindexResult reindexAll() {
        List<Product> products = productRepo.findAll();
        List<Order> orders = orderRepo.findAll();        // entity graph loads items, products and owner

        List<Document> documents = new ArrayList<>();
        for (Product p : products) {
            documents.add(new Document(UUID.randomUUID().toString(),
                    VectorDocs.productContent(p), VectorDocs.productMetadata(p.getId())));
        }
        for (Order o : orders) {
            documents.add(new Document(UUID.randomUUID().toString(),
                    VectorDocs.orderContent(o), VectorDocs.orderMetadata(o)));
        }

        jdbcTemplate.update("DELETE FROM vector_store");
        if (!documents.isEmpty()) {
            vectorStore.add(documents);
        }
        return new ReindexResult(products.size(), orders.size());
    }
}
