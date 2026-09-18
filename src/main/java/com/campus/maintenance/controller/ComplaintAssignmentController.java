package com.campus.maintenance.controller;

import com.campus.maintenance.dto.CreateAssignmentRequest;
import com.campus.maintenance.entity.ComplaintAssignment;
import com.campus.maintenance.service.ComplaintAssignmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import com.campus.maintenance.security.CustomUserDetails;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
public class ComplaintAssignmentController {

    private final ComplaintAssignmentService assignmentService;

    public ComplaintAssignmentController(ComplaintAssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @PostMapping
    public ResponseEntity<ComplaintAssignment> assignComplaint(@Valid @RequestBody CreateAssignmentRequest request,
                                                                Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof CustomUserDetails details)
                || details.getAuthorities().stream().noneMatch(authority ->
                "ROLE_STAFF".equals(authority.getAuthority()) || "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only STAFF or ADMIN users can assign complaints");
        }
        ComplaintAssignment assignment = assignmentService.assignComplaint(
                request.getComplaintId(), request.getWorkerId(), details.getUser().getId(), request.getRemarks());
        return ResponseEntity.status(HttpStatus.CREATED).body(assignment);
    }

    @GetMapping("/complaint/{complaintId}")
    public List<ComplaintAssignment> getAssignmentsForComplaint(@PathVariable Long complaintId,
                                                                Authentication authentication) {
        ensureStaffOrAssignedWorker(complaintId, authentication);
        return assignmentService.getAssignmentsForComplaint(complaintId);
    }

    @GetMapping("/worker/{workerId}")
    public List<ComplaintAssignment> getAssignmentsForWorker(@PathVariable Long workerId,
                                                             Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authentication is required");
        }
        boolean staffOrAdmin = details.getAuthorities().stream().anyMatch(authority ->
                "ROLE_STAFF".equals(authority.getAuthority()) || "ROLE_ADMIN".equals(authority.getAuthority()));
        boolean ownWorker = details.getAuthorities().stream().anyMatch(authority ->
                "ROLE_WORKER".equals(authority.getAuthority()))
                && details.getUser().getId().equals(workerId);
        if (!staffOrAdmin && !ownWorker) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view permitted assignments");
        }
        return assignmentService.getAssignmentsForWorker(workerId);
    }

    @GetMapping("/{id}")
    public ComplaintAssignment getAssignmentById(@PathVariable Long id, Authentication authentication) {
        ComplaintAssignment assignment = assignmentService.getAssignmentById(id);
        ensureStaffOrAssignedWorker(assignment.getComplaint().getId(), authentication);
        return assignment;
    }

    private void ensureStaffOrAssignedWorker(Long complaintId, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authentication is required");
        }
        boolean staffOrAdmin = details.getAuthorities().stream().anyMatch(authority ->
                "ROLE_STAFF".equals(authority.getAuthority()) || "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!staffOrAdmin && !assignmentService.isAssignedToWorker(complaintId, details.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view permitted assignments");
        }
    }
}
