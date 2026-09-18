package com.campus.maintenance.controller;

import com.campus.maintenance.entity.Notification;
import com.campus.maintenance.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import com.campus.maintenance.security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/user/{userId}")
    public List<Notification> getNotificationsForUser(@PathVariable Long userId, Authentication authentication) {
        ensureCurrentUser(userId, authentication);
        return notificationService.getNotificationsForUser(userId);
    }

    @GetMapping("/user/{userId}/unread")
    public List<Notification> getUnreadNotificationsForUser(@PathVariable Long userId, Authentication authentication) {
        ensureCurrentUser(userId, authentication);
        return notificationService.getUnreadNotificationsForUser(userId);
    }

    @PutMapping("/{id}/read")
    public Notification markNotificationAsRead(@PathVariable Long id, Authentication authentication) {
        Notification notification = notificationService.getNotificationById(id);
        ensureCurrentUser(notification.getUser().getId(), authentication);
        return notificationService.markNotificationAsRead(id);
    }

    private void ensureCurrentUser(Long userId, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof CustomUserDetails details)
                || !details.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view your own notifications");
        }
    }
}
