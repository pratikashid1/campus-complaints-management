package com.campus.maintenance.repository;

import com.campus.maintenance.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @Override
    @EntityGraph(attributePaths = "role")
    List<User> findAll();

    @EntityGraph(attributePaths = "role")
    Optional<User> findByEmail(String email);

    List<User> findByRole_Name(String roleName);

    List<User> findByIsActiveTrue();
}
