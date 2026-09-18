package com.campus.maintenance.dto;

import com.campus.maintenance.entity.User;

public class AuthResponse {

    private Long id;
    private String name;
    private String email;
    private String role;
    private Boolean isActive;

    public AuthResponse() {
    }

    public AuthResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole() == null ? null : user.getRole().getName();
        this.isActive = user.getIsActive();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public Boolean getIsActive() { return isActive; }
}
