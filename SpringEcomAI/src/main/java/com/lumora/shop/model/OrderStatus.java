package com.lumora.shop.model;

/**
 * Order lifecycle:
 * PLACED -> CONFIRMED -> SHIPPED -> DELIVERED, and PLACED/CONFIRMED -> CANCELLED.
 * DELIVERED and CANCELLED are terminal.
 */
public enum OrderStatus {
    PLACED, CONFIRMED, SHIPPED, DELIVERED, CANCELLED;

    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PLACED -> next == CONFIRMED || next == CANCELLED;
            case CONFIRMED -> next == SHIPPED || next == CANCELLED;
            case SHIPPED -> next == DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }

    /** A customer may cancel only before the parcel has shipped. */
    public boolean isCancellable() {
        return canTransitionTo(CANCELLED);
    }
}
