package com.campus.maintenance.dto;

import com.campus.maintenance.entity.Priority;
import jakarta.validation.constraints.NotNull;

public class UpdateComplaintPriorityRequest {

    @NotNull
    private Priority priority;

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }
}
