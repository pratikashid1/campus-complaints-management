package com.campus.maintenance.repository;

import com.campus.maintenance.entity.ComplaintCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComplaintCategoryRepository extends JpaRepository<ComplaintCategory, Long> {

    Optional<ComplaintCategory> findByName(String name);

    List<ComplaintCategory> findByIsActiveTrue();
}
