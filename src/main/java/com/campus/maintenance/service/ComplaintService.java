package com.campus.maintenance.service;

import com.campus.maintenance.entity.Complaint;
import com.campus.maintenance.entity.ComplaintCategory;
import com.campus.maintenance.entity.ComplaintStatusHistory;
import com.campus.maintenance.entity.Location;
import com.campus.maintenance.entity.Notification;
import com.campus.maintenance.entity.Priority;
import com.campus.maintenance.entity.Status;
import com.campus.maintenance.entity.User;
import com.campus.maintenance.repository.ComplaintRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Optional;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserService userService;
    private final ComplaintCategoryService categoryService;
    private final LocationService locationService;
    private final ComplaintStatusHistoryService statusHistoryService;
    private final NotificationService notificationService;

    public ComplaintService(ComplaintRepository complaintRepository,
                            UserService userService,
                            ComplaintCategoryService categoryService,
                            LocationService locationService,
                            ComplaintStatusHistoryService statusHistoryService,
                            NotificationService notificationService) {
        this.complaintRepository = complaintRepository;
        this.userService = userService;
        this.categoryService = categoryService;
        this.locationService = locationService;
        this.statusHistoryService = statusHistoryService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Complaint createComplaint(Complaint complaint) {
        validateComplaintText(complaint.getTitle(), complaint.getDescription());

        User user = userService.getUserById(getRelatedId(complaint.getUser(), "User not found"));
        ComplaintCategory category = categoryService.getCategoryById(
                getRelatedId(complaint.getCategory(), "Category not found"));
        Location location = locationService.getLocationById(
                getRelatedId(complaint.getLocation(), "Location not found"));

        LocalDateTime now = LocalDateTime.now();
        complaint.setUser(user);
        complaint.setCategory(category);
        complaint.setLocation(location);
        complaint.setTitle(complaint.getTitle().trim());
        complaint.setDescription(complaint.getDescription().trim());
        complaint.setComplaintNumber(generateComplaintNumber());
        complaint.setStatus(Status.SUBMITTED);
        complaint.setPriority(complaint.getPriority() == null ? Priority.MEDIUM : complaint.getPriority());
        complaint.setCreatedAt(now);
        complaint.setUpdatedAt(now);

        Complaint savedComplaint = complaintRepository.save(complaint);

        ComplaintStatusHistory history = new ComplaintStatusHistory();
        history.setComplaint(savedComplaint);
        history.setOldStatus(null);
        history.setNewStatus(Status.SUBMITTED);
        history.setChangedBy(user);
        history.setChangedAt(now);
        statusHistoryService.saveHistory(history);
        notifyUser(user, savedComplaint, "Complaint submitted",
                "Your complaint " + savedComplaint.getComplaintNumber() + " was submitted successfully.");
        notifyRole("STAFF", savedComplaint, "New complaint submitted",
                "A new complaint " + savedComplaint.getComplaintNumber() + " needs review.");
        notifyRole("ADMIN", savedComplaint, "New complaint submitted",
                "A new complaint " + savedComplaint.getComplaintNumber() + " was submitted.");

        return savedComplaint;
    }

    public Complaint getComplaintById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
    }

    public Optional<Complaint> findByComplaintNumber(String complaintNumber) {
        return complaintRepository.findByComplaintNumber(complaintNumber);
    }

    public Complaint getComplaintByComplaintNumber(String complaintNumber) {
        return complaintRepository.findByComplaintNumber(complaintNumber)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
    }

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    public List<Complaint> getComplaintsByUser(Long userId) {
        return complaintRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Complaint> getComplaintsByStatus(Status status) {
        return complaintRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    public List<Complaint> getComplaintsByPriority(Priority priority) {
        return complaintRepository.findByPriority(priority);
    }

    public List<Complaint> getComplaintsByCategory(Long categoryId) {
        return complaintRepository.findByCategoryId(categoryId);
    }

    public List<Complaint> getComplaintsByLocation(Long locationId) {
        return complaintRepository.findByLocationId(locationId);
    }

    public Complaint updateComplaint(Long id, Complaint updatedComplaint) {
        Complaint complaint = getComplaintById(id);
        validateComplaintText(updatedComplaint.getTitle(), updatedComplaint.getDescription());
        complaint.setTitle(updatedComplaint.getTitle().trim());
        complaint.setDescription(updatedComplaint.getDescription().trim());

        if (updatedComplaint.getCategory() != null) {
            complaint.setCategory(categoryService.getCategoryById(
                    getRelatedId(updatedComplaint.getCategory(), "Category not found")));
        }
        if (updatedComplaint.getLocation() != null) {
            complaint.setLocation(locationService.getLocationById(
                    getRelatedId(updatedComplaint.getLocation(), "Location not found")));
        }
        if (updatedComplaint.getPriority() != null) {
            complaint.setPriority(updatedComplaint.getPriority());
        }

        complaint.setUpdatedAt(LocalDateTime.now());
        return complaintRepository.save(complaint);
    }

    public Complaint updateComplaintPriority(Long complaintId, Priority priority) {
        if (priority == null) {
            throw new RuntimeException("Priority is required");
        }
        Complaint complaint = getComplaintById(complaintId);
        complaint.setPriority(priority);
        complaint.setUpdatedAt(LocalDateTime.now());
        return complaintRepository.save(complaint);
    }

    @Transactional
    public Complaint updateComplaintStatus(Long complaintId, Status newStatus,
                                           Long changedByUserId, String remarks) {
        if (newStatus == null) {
            throw new RuntimeException("New status is required");
        }

        Complaint complaint = getComplaintById(complaintId);
        User changedBy = userService.getUserById(changedByUserId);
        Status oldStatus = complaint.getStatus();

        if (!isValidStatusTransition(oldStatus, newStatus)) {
            throw new RuntimeException("Invalid complaint status transition");
        }

        LocalDateTime now = LocalDateTime.now();
        complaint.setStatus(newStatus);
        complaint.setUpdatedAt(now);
        if (newStatus == Status.RESOLVED && complaint.getResolvedAt() == null) {
            complaint.setResolvedAt(now);
        }
        if (newStatus == Status.CLOSED && complaint.getClosedAt() == null) {
            complaint.setClosedAt(now);
        }
        Complaint savedComplaint = complaintRepository.save(complaint);

        ComplaintStatusHistory history = new ComplaintStatusHistory();
        history.setComplaint(savedComplaint);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(changedBy);
        history.setRemarks(remarks);
        history.setChangedAt(now);
        statusHistoryService.saveHistory(history);
        String statusLabel = newStatus.name().replace('_', ' ').toLowerCase();
        notifyUser(complaint.getUser(), savedComplaint, "Complaint status updated",
                "Your complaint " + savedComplaint.getComplaintNumber() + " is now " + statusLabel + ".");
        notifyRole("STAFF", savedComplaint, "Complaint status updated",
                "Complaint " + savedComplaint.getComplaintNumber() + " is now " + statusLabel + ".");
        notifyRole("ADMIN", savedComplaint, "Complaint status updated",
                "Complaint " + savedComplaint.getComplaintNumber() + " is now " + statusLabel + ".");

        return savedComplaint;
    }

    private void notifyUser(User user, Complaint complaint, String title, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setComplaint(complaint);
        notification.setTitle(title);
        notification.setMessage(message);
        notificationService.createNotification(notification);
    }

    private void notifyRole(String role, Complaint complaint, String title, String message) {
        userService.getUsersByRole(role).stream()
                .filter(user -> Boolean.TRUE.equals(user.getIsActive()))
                .forEach(user -> notifyUser(user, complaint, title, message));
    }

    private String generateComplaintNumber() {
        long sequence = complaintRepository.count() + 1;
        String prefix = "CMP-" + Year.now().getValue() + "-";
        String complaintNumber;
        do {
            complaintNumber = prefix + String.format("%06d", sequence++);
        } while (complaintRepository.findByComplaintNumber(complaintNumber).isPresent());
        return complaintNumber;
    }

    private boolean isValidStatusTransition(Status oldStatus, Status newStatus) {
        if (oldStatus == null) {
            return newStatus == Status.SUBMITTED;
        }
        return switch (oldStatus) {
            case SUBMITTED -> newStatus == Status.UNDER_REVIEW || newStatus == Status.CANCELLED;
            case UNDER_REVIEW -> newStatus == Status.ASSIGNED;
            case ASSIGNED -> newStatus == Status.IN_PROGRESS;
            case IN_PROGRESS -> newStatus == Status.RESOLVED;
            case RESOLVED -> newStatus == Status.CLOSED;
            case CLOSED, CANCELLED -> false;
        };
    }

    private void validateComplaintText(String title, String description) {
        if (title == null || title.isBlank()) {
            throw new RuntimeException("Complaint title must not be blank");
        }
        if (description == null || description.isBlank()) {
            throw new RuntimeException("Complaint description must not be blank");
        }
    }

    private Long getRelatedId(Object relatedEntity, String message) {
        if (relatedEntity instanceof User user && user.getId() != null) {
            return user.getId();
        }
        if (relatedEntity instanceof ComplaintCategory category && category.getId() != null) {
            return category.getId();
        }
        if (relatedEntity instanceof Location location && location.getId() != null) {
            return location.getId();
        }
        throw new RuntimeException(message);
    }
}
