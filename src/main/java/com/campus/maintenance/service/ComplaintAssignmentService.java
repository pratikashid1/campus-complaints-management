package com.campus.maintenance.service;

import com.campus.maintenance.entity.Complaint;
import com.campus.maintenance.entity.ComplaintAssignment;
import com.campus.maintenance.entity.Status;
import com.campus.maintenance.entity.User;
import com.campus.maintenance.entity.Notification;
import com.campus.maintenance.repository.ComplaintAssignmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintAssignmentService {

    private final ComplaintAssignmentRepository assignmentRepository;
    private final ComplaintService complaintService;
    private final UserService userService;
    private final NotificationService notificationService;

    public ComplaintAssignmentService(ComplaintAssignmentRepository assignmentRepository,
                                      ComplaintService complaintService,
                                      UserService userService,
                                      NotificationService notificationService) {
        this.assignmentRepository = assignmentRepository;
        this.complaintService = complaintService;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    @Transactional
    public ComplaintAssignment assignComplaint(Long complaintId, Long workerId,
                                               Long assignedByUserId, String remarks) {
        Complaint complaint = complaintService.getComplaintById(complaintId);
        User worker = userService.getUserById(workerId);
        User assignedBy = userService.getUserById(assignedByUserId);

        if (!isWorker(worker) || !Boolean.TRUE.equals(worker.getIsActive())) {
            throw new RuntimeException("Only an active WORKER can be assigned");
        }
        if (!isStaffOrAdmin(assignedBy) || !Boolean.TRUE.equals(assignedBy.getIsActive())) {
            throw new RuntimeException("Only an active STAFF or ADMIN user can assign complaints");
        }

        ComplaintAssignment assignment = new ComplaintAssignment();
        assignment.setComplaint(complaint);
        assignment.setWorker(worker);
        assignment.setAssignedBy(assignedBy);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setRemarks(remarks);
        ComplaintAssignment savedAssignment = assignmentRepository.save(assignment);

        complaintService.updateComplaintStatus(complaintId, Status.ASSIGNED, assignedByUserId, remarks);
        Notification notification = new Notification();
        notification.setUser(worker);
        notification.setComplaint(complaint);
        notification.setTitle("Complaint assigned");
        notification.setMessage("Complaint " + complaint.getComplaintNumber() + " has been assigned to you.");
        notificationService.createNotification(notification);
        return savedAssignment;
    }

    public ComplaintAssignment getAssignmentById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
    }

    public List<ComplaintAssignment> getAssignmentsForComplaint(Long complaintId) {
        return assignmentRepository.findByComplaintId(complaintId);
    }

    public List<ComplaintAssignment> getAssignmentsForWorker(Long workerId) {
        return assignmentRepository.findByWorkerIdOrderByAssignedAtDesc(workerId);
    }

    public boolean isAssignedToWorker(Long complaintId, Long workerId) {
        return assignmentRepository.findByComplaintId(complaintId).stream()
                .max((left, right) -> left.getAssignedAt().compareTo(right.getAssignedAt()))
                .map(assignment -> assignment.getWorker() != null
                        && workerId.equals(assignment.getWorker().getId()))
                .orElse(false);
    }

    private boolean isWorker(User user) {
        return user.getRole() != null && "WORKER".equals(user.getRole().getName());
    }

    private boolean isStaffOrAdmin(User user) {
        return user.getRole() != null
                && ("STAFF".equals(user.getRole().getName()) || "ADMIN".equals(user.getRole().getName()));
    }
}
