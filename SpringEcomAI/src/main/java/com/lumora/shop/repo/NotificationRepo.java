package com.lumora.shop.repo;

import com.lumora.shop.model.AdminNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepo extends JpaRepository<AdminNotification, Long> {

    List<AdminNotification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countBySeenFalse();

    @Modifying
    @Query("update AdminNotification n set n.seen = true where n.seen = false")
    int markAllSeen();
}
