package com.campus.maintenance.dto;

import com.campus.maintenance.entity.User;

import java.time.LocalDateTime;

public class AdminUserResponse {
    private final Long id;
    private final String name;
    private final String email;
    private final String role;
    private final Boolean isActive;
    private final LocalDateTime createdAt;

    public AdminUserResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole() == null ? null : user.getRole().getName();
        this.isActive = user.getIsActive();
        this.createdAt = user.getCreatedAt();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public Boolean getIsActive() { return isActive; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
