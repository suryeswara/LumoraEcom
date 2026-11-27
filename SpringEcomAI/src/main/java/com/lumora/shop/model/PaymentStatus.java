package com.lumora.shop.model;

/**
 * PENDING (default) -> PAID (admin confirms receipt, or COD is delivered) and PAID -> REFUNDED (a paid order is cancelled).
 * FAILED can be set by an admin when an online payment did not go through.
 */
public enum PaymentStatus {
    PENDING, PAID, FAILED, REFUNDED
}
