package com.lumora.shop.repo;

import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(Role role);
    List<AppUser> findByRoleOrderByCreatedAtDesc(Role role);
}
