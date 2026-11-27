package com.lumora.shop.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;
    private String brand;
    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal price;
    private String category;
    private Date releaseDate;
    private boolean productAvailable;
    @PositiveOrZero(message = "Stock cannot be negative")
    private int stockQuantity;
    private String imageName;
    private String imageType;

    @Lob
    private byte[] productImage;

    public Product(int id) {
        this.id = id;
    }
}
