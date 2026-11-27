package com.lumora.shop.model.dto;

import com.lumora.shop.model.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderRequest(
        @NotBlank(message = "Customer name is required") String customerName,
        @NotBlank(message = "Email is required") @Email(message = "Enter a valid email") String email,
        @NotEmpty(message = "An order needs at least one item") List<@Valid OrderItemRequest> items,
        @NotBlank(message = "Delivery address is required") @Size(max = 500, message = "Address is too long") String shippingAddress,
        @NotBlank(message = "Phone number is required") @Size(max = 20, message = "Phone number is too long") String phone,
        PaymentMethod paymentMethod            // optional: defaults to COD
) {
    /** Convenience for tests and internal callers that do not care about delivery details. */
    public OrderRequest(String customerName, String email, List<OrderItemRequest> items) {
        this(customerName, email, items, null, null, null);
    }
}
