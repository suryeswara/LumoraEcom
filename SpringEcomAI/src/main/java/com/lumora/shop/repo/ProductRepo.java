package com.lumora.shop.repo;

import com.lumora.shop.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.lumora.shop.repo.Projections.ProductStockView;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepo extends JpaRepository<Product, Integer> {

    /**
     * SELECT ... FOR UPDATE: locks the row until the surrounding transaction ends, so two concurrent orders for
     * the last unit are serialized and the second one sees the already-reduced stock (no overselling).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") int id);

    /** Admin stock table: id, name, brand, category, stock, availability and price only (no image bytes). */
    List<ProductStockView> findAllProjectedBy();
}
