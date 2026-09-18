package com.campus.maintenance.dto;

import jakarta.validation.constraints.NotNull;

public class CreateAssignmentRequest {

    @NotNull
    private Long complaintId;

    @NotNull
    private Long workerId;

    @NotNull
    private Long assignedByUserId;

    private String remarks;

    public Long getComplaintId() { return complaintId; }
    public void setComplaintId(Long complaintId) { this.complaintId = complaintId; }
    public Long getWorkerId() { return workerId; }
    public void setWorkerId(Long workerId) { this.workerId = workerId; }
    public Long getAssignedByUserId() { return assignedByUserId; }
    public void setAssignedByUserId(Long assignedByUserId) { this.assignedByUserId = assignedByUserId; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
