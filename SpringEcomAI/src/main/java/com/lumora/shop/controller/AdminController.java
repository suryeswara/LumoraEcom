package com.lumora.shop.controller;

import com.lumora.shop.vector.ReindexResult;
import com.lumora.shop.vector.VectorIndexService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Maintenance endpoints. ADMIN only (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final VectorIndexService vectorIndexService;

    public AdminController(VectorIndexService vectorIndexService) {
        this.vectorIndexService = vectorIndexService;
    }

    /** Rebuilds the vector index from the database. Run once after upgrading from the old index schema. */
    @PostMapping("/reindex")
    public ResponseEntity<ReindexResult> reindex() {
        return ResponseEntity.ok(vectorIndexService.reindexAll());
    }
}
