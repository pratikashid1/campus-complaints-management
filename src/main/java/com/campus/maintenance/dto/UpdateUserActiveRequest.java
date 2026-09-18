package com.campus.maintenance.dto;

import jakarta.validation.constraints.NotNull;

public class UpdateUserActiveRequest {
    @NotNull
    private Boolean active;

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
