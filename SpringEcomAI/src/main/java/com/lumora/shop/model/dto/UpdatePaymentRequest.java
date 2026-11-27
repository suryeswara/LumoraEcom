package com.lumora.shop.model.dto;

import com.lumora.shop.model.PaymentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdatePaymentRequest(@NotNull(message = "Payment status is required") PaymentStatus paymentStatus) {}
