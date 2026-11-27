package com.lumora.shop.vector;

import java.util.Map;

/** "Replace the embedding that matches deleteFilter with this content." Applied only AFTER the DB commit. */
public record VectorUpsertEvent(String deleteFilter, String content, Map<String, Object> metadata) {}
