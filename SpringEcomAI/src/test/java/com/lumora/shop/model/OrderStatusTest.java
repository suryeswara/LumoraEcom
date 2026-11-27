package com.lumora.shop.model;

import org.junit.jupiter.api.Test;

import static com.lumora.shop.model.OrderStatus.*;
import static org.assertj.core.api.Assertions.assertThat;

class OrderStatusTest {

    @Test
    void forwardTransitionsAreAllowed() {
        assertThat(PLACED.canTransitionTo(CONFIRMED)).isTrue();
        assertThat(CONFIRMED.canTransitionTo(SHIPPED)).isTrue();
        assertThat(SHIPPED.canTransitionTo(DELIVERED)).isTrue();
    }

    @Test
    void skippingOrGoingBackwardsIsRejected() {
        assertThat(PLACED.canTransitionTo(SHIPPED)).isFalse();
        assertThat(PLACED.canTransitionTo(DELIVERED)).isFalse();
        assertThat(CONFIRMED.canTransitionTo(PLACED)).isFalse();
        assertThat(SHIPPED.canTransitionTo(CONFIRMED)).isFalse();
    }

    @Test
    void terminalStatesAllowNothing() {
        for (OrderStatus next : OrderStatus.values()) {
            assertThat(DELIVERED.canTransitionTo(next)).isFalse();
            assertThat(CANCELLED.canTransitionTo(next)).isFalse();
        }
    }

    @Test
    void cancellableOnlyBeforeShipping() {
        assertThat(PLACED.isCancellable()).isTrue();
        assertThat(CONFIRMED.isCancellable()).isTrue();
        assertThat(SHIPPED.isCancellable()).isFalse();
        assertThat(DELIVERED.isCancellable()).isFalse();
        assertThat(CANCELLED.isCancellable()).isFalse();
    }
}
