package com.campus.maintenance.service;

import com.campus.maintenance.entity.ComplaintStatusHistory;
import com.campus.maintenance.repository.ComplaintStatusHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComplaintStatusHistoryService {

    private final ComplaintStatusHistoryRepository statusHistoryRepository;

    public ComplaintStatusHistoryService(ComplaintStatusHistoryRepository statusHistoryRepository) {
        this.statusHistoryRepository = statusHistoryRepository;
    }

    public List<ComplaintStatusHistory> getHistoryForComplaint(Long complaintId) {
        return statusHistoryRepository.findByComplaintIdOrderByChangedAtAsc(complaintId);
    }

    public ComplaintStatusHistory saveHistory(ComplaintStatusHistory history) {
        return statusHistoryRepository.save(history);
    }
}
