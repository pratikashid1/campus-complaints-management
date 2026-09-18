package com.campus.maintenance.controller;

import com.campus.maintenance.dto.CreateComplaintRequest;
import com.campus.maintenance.dto.UpdateComplaintPriorityRequest;
import com.campus.maintenance.dto.UpdateComplaintStatusRequest;
import com.campus.maintenance.entity.Complaint;
import com.campus.maintenance.entity.ComplaintCategory;
import com.campus.maintenance.entity.Location;
import com.campus.maintenance.entity.Priority;
import com.campus.maintenance.entity.Status;
import com.campus.maintenance.entity.User;
import com.campus.maintenance.service.ComplaintService;
import com.campus.maintenance.service.ComplaintStatusHistoryService;
import com.campus.maintenance.service.ComplaintAssignmentService;
import com.campus.maintenance.security.CustomUserDetails;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;
    private final ComplaintStatusHistoryService statusHistoryService;
    private final ComplaintAssignmentService assignmentService;

    public ComplaintController(ComplaintService complaintService,
                               ComplaintStatusHistoryService statusHistoryService,
                               ComplaintAssignmentService assignmentService) {
        this.complaintService = complaintService;
        this.statusHistoryService = statusHistoryService;
        this.assignmentService = assignmentService;
    }

    @GetMapping
    public List<Complaint> getAllComplaints(Authentication authentication) {
        ensureStaffOrAdmin(authentication);
        return complaintService.getAllComplaints();
    }

    @GetMapping("/{id}")
    public Complaint getComplaintById(@PathVariable Long id, Authentication authentication) {
        Complaint complaint = complaintService.getComplaintById(id);
        ensureComplaintAccess(complaint, authentication);
        return complaint;
    }

    @GetMapping("/number/{complaintNumber}")
    public Complaint getComplaintByNumber(@PathVariable String complaintNumber, Authentication authentication) {
        ensureStaffOrAdmin(authentication);
        return complaintService.getComplaintByComplaintNumber(complaintNumber);
    }

    @GetMapping("/user/{userId}")
    public List<Complaint> getComplaintsByUser(@PathVariable Long userId, Authentication authentication) {
        ensureStudentOwnsUser(userId, authentication);
        return complaintService.getComplaintsByUser(userId);
    }

    @GetMapping("/{id}/history")
    public List<com.campus.maintenance.entity.ComplaintStatusHistory> getComplaintHistory(
            @PathVariable Long id, Authentication authentication) {
        Complaint complaint = complaintService.getComplaintById(id);
        ensureComplaintAccess(complaint, authentication);
        return statusHistoryService.getHistoryForComplaint(id);
    }

    @GetMapping("/status/{status}")
    public List<Complaint> getComplaintsByStatus(@PathVariable Status status, Authentication authentication) {
        ensureStaffOrAdmin(authentication);
        return complaintService.getComplaintsByStatus(status);
    }

    @GetMapping("/priority/{priority}")
    public List<Complaint> getComplaintsByPriority(@PathVariable Priority priority, Authentication authentication) {
        ensureStaffOrAdmin(authentication);
        return complaintService.getComplaintsByPriority(priority);
    }

    @PostMapping
    public ResponseEntity<Complaint> createComplaint(@Valid @RequestBody CreateComplaintRequest request,
                                                     Authentication authentication) {
        if (!isStudent(authentication) || !currentUserId(authentication).equals(request.getUserId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Students can only create complaints for themselves");
        }
        Complaint complaint = new Complaint();
        complaint.setUser(referenceUser(request.getUserId()));
        complaint.setCategory(referenceCategory(request.getCategoryId()));
        complaint.setLocation(referenceLocation(request.getLocationId()));
        complaint.setTitle(request.getTitle());
        complaint.setDescription(request.getDescription());
        complaint.setPriority(request.getPriority());

        return ResponseEntity.status(HttpStatus.CREATED).body(complaintService.createComplaint(complaint));
    }

    @PutMapping("/{id}/priority")
    public Complaint updatePriority(@PathVariable Long id,
                                    @Valid @RequestBody UpdateComplaintPriorityRequest request,
                                    Authentication authentication) {
        ensureStaffOrAdmin(authentication);
        return complaintService.updateComplaintPriority(id, request.getPriority());
    }

    @PutMapping("/{id}/status")
    public Complaint updateStatus(@PathVariable Long id,
                                  @Valid @RequestBody UpdateComplaintStatusRequest request,
                                  Authentication authentication) {
        ensureCanUpdateStatus(id, authentication);
        ensureCurrentUser(authentication, request.getChangedByUserId());
        return complaintService.updateComplaintStatus(
                id, request.getNewStatus(), request.getChangedByUserId(), request.getRemarks());
    }

    private User referenceUser(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private ComplaintCategory referenceCategory(Long id) {
        ComplaintCategory category = new ComplaintCategory();
        category.setId(id);
        return category;
    }

    private Location referenceLocation(Long id) {
        Location location = new Location();
        location.setId(id);
        return location;
    }

    private void ensureStudentOwnsComplaint(Complaint complaint, Authentication authentication) {
        if (isStudent(authentication) && !currentUserId(authentication).equals(complaint.getUser().getId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "You cannot access this complaint");
        }
    }

    private void ensureStudentOwnsUser(Long userId, Authentication authentication) {
        if (isStudent(authentication) && !currentUserId(authentication).equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "You cannot access another user's complaints");
        }
    }

    private boolean isStudent(Authentication authentication) {
        return authentication != null && authentication.getPrincipal() instanceof CustomUserDetails details
                && details.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_STUDENT".equals(authority.getAuthority()));
    }

    private Long currentUserId(Authentication authentication) {
        return ((CustomUserDetails) authentication.getPrincipal()).getUser().getId();
    }

    private void ensureStaffOrAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_STAFF".equals(authority.getAuthority())
                        || "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only STAFF or ADMIN users can manage complaints");
        }
    }

    private void ensureComplaintAccess(Complaint complaint, Authentication authentication) {
            if (isStudent(authentication)) {
                ensureStudentOwnsComplaint(complaint, authentication);
                return;
            }
            if (isWorker(authentication) && !assignmentService.isAssignedToWorker(
                    complaint.getId(), currentUserId(authentication))) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN,
                        "You can only access complaints assigned to you");
            }
        }

    private void ensureCanUpdateStatus(Long complaintId, Authentication authentication) {
            if (isStaffOrAdmin(authentication)) {
                return;
            }
            if (isWorker(authentication) && assignmentService.isAssignedToWorker(
                    complaintId, currentUserId(authentication))) {
                return;
            }
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the assigned worker or staff can update this complaint");
        }

    private boolean isStaffOrAdmin(Authentication authentication) {
            return authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(authority -> "ROLE_STAFF".equals(authority.getAuthority())
                            || "ROLE_ADMIN".equals(authority.getAuthority()));
        }

    private boolean isWorker(Authentication authentication) {
            return authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(authority -> "ROLE_WORKER".equals(authority.getAuthority()));
    }

    private void ensureCurrentUser(Authentication authentication, Long userId) {
        if (!(authentication.getPrincipal() instanceof CustomUserDetails details)
                || !details.getUser().getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Changes must use the current authenticated user");
        }
    }
}
