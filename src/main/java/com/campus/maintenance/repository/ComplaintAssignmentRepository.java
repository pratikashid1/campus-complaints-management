package com.campus.maintenance.repository;

import com.campus.maintenance.entity.ComplaintAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintAssignmentRepository extends JpaRepository<ComplaintAssignment, Long> {

    List<ComplaintAssignment> findByComplaintId(Long complaintId);

    List<ComplaintAssignment> findByWorkerId(Long workerId);

    List<ComplaintAssignment> findByAssignedById(Long assignedById);

    List<ComplaintAssignment> findByWorkerIdOrderByAssignedAtDesc(Long workerId);
}
