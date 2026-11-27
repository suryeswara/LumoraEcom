package com.lumora.shop.vector;

/** "Remove the embedding that matches deleteFilter." Applied only AFTER the DB commit. */
public record VectorDeleteEvent(String deleteFilter) {}
