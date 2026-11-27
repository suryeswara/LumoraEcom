package com.lumora.shop.controller;

import com.lumora.shop.model.Product;
import com.lumora.shop.model.dto.GeneratedProductResponse;
import com.lumora.shop.service.ProductGenerationService;
import com.lumora.shop.service.ProductService;
import io.micrometer.context.Nullable;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;


@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductGenerationService productGenerationService;

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts() {
        return new ResponseEntity<>(productService.getAllProducts(), HttpStatus.OK);
    }

    @GetMapping("/product/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable int id) {
        Product product = productService.getProductById(id);
        if (product.getId() > 0) {
            return new ResponseEntity<>(product, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/product/{productId}/image")
    public ResponseEntity<byte[]> getProductImage(@PathVariable int productId) {
        Product product = productService.getProductById(productId);
        if (product.getId() > 0 && product.getProductImage() != null) {
            org.springframework.http.MediaType type = org.springframework.http.MediaType.APPLICATION_OCTET_STREAM;
            try {
                if (product.getImageType() != null) type = org.springframework.http.MediaType.parseMediaType(product.getImageType());
            } catch (org.springframework.http.InvalidMediaTypeException ignored) {
                // keep the generic type
            }
            return ResponseEntity.ok().contentType(type).body(product.getProductImage());
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }


    @PostMapping("/product")
    public ResponseEntity<?> addProduct(@Valid @RequestPart Product product, @RequestPart(required = false) MultipartFile imageFile) {
        Product savedProduct = null;
        try {
            savedProduct = productService.addOrUpdateProduct(product, imageFile);
            return new ResponseEntity<>(savedProduct, HttpStatus.CREATED);
        } catch (IOException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

    @PostMapping("/product/generate-description")
    public ResponseEntity<String> generateDescription(@RequestParam String name, @RequestParam String category) {

        try {
            String aiDescription = productService.generateDescription(name, category);
            return new ResponseEntity<>(aiDescription, HttpStatus.OK);
        }catch (Exception e){
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

    @PostMapping("/product/generate-image")
    public ResponseEntity<?> generateImage(@RequestParam String name, @RequestParam String category, @RequestParam String description) {
        try{
            byte[] aiImage = productService.generateImage(name, category, description);
            return new ResponseEntity<>(aiImage,HttpStatus.OK);
        }catch (Exception e){
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Returns an AI-generated product DRAFT (nothing is saved). The frontend pre-fills
     * the Add Product form with it; the seller reviews and saves via POST /api/product.
     */
    @PostMapping("/product/generate-product")
    public ResponseEntity<?> generateProduct(@RequestParam String query) {
        try {
            GeneratedProductResponse draft = productGenerationService.generateProduct(query);
            return new ResponseEntity<>(draft, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            // Upstream AI failure: do not leak internal/provider details to the client.
            return new ResponseEntity<>("AI could not generate a product right now. Please try again.",
                    HttpStatus.BAD_GATEWAY);
        }
    }

    @PutMapping("/product/{id}")
    public ResponseEntity<String> updateProduct(@PathVariable int id, @Valid @RequestPart Product product, @Nullable @RequestPart MultipartFile imageFile) {
        Product existing = productService.getProductById(id);
        if (existing == null || existing.getId() <= 0) {
            return new ResponseEntity<>("Not Found", HttpStatus.NOT_FOUND);
        }
        product.setId(id);   // the URL decides which product is updated, not a (possibly different) id in the body
        try {
            productService.addOrUpdateProduct(product, imageFile);
            return new ResponseEntity<>("Updated", HttpStatus.OK);
        } catch (IOException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @DeleteMapping("/product/{id}")
    public ResponseEntity<String> deleteProduct(@PathVariable int id) {
        Product product = productService.getProductById(id);
        if (product != null && product.getId() > 0) {   // the service returns Product(-1) for a missing id, never null
            productService.deleteProduct(id);
            return new ResponseEntity<>("Deleted", HttpStatus.OK);
        } else {
            return new ResponseEntity<>("Not Found", HttpStatus.NOT_FOUND);
        }
    }


    @GetMapping("/products/smart-search")
    public ResponseEntity<List<Product>> smartSearchProducts(@RequestParam String query) {
        List<Product> products = productService.semanticSearchProducts(query);
        return new ResponseEntity<>(products, HttpStatus.OK);
    }

}
