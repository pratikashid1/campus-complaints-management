package com.campus.maintenance.repository;

import com.campus.maintenance.entity.Complaint;
import com.campus.maintenance.entity.Priority;
import com.campus.maintenance.entity.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByUserId(Long userId);

    List<Complaint> findByStatus(Status status);

    List<Complaint> findByPriority(Priority priority);

    List<Complaint> findByCategoryId(Long categoryId);

    List<Complaint> findByLocationId(Long locationId);

    Optional<Complaint> findByComplaintNumber(String complaintNumber);

    List<Complaint> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Complaint> findByStatusOrderByCreatedAtDesc(Status status);
}
