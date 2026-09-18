package com.campus.maintenance.controller;

import com.campus.maintenance.dto.AdminCreateUserRequest;
import com.campus.maintenance.dto.AdminUserResponse;
import com.campus.maintenance.dto.UpdateUserActiveRequest;
import com.campus.maintenance.entity.User;
import com.campus.maintenance.repository.ComplaintRepository;
import com.campus.maintenance.repository.RoleRepository;
import com.campus.maintenance.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ComplaintRepository complaintRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(UserRepository userRepository, RoleRepository roleRepository,
                           ComplaintRepository complaintRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.complaintRepository = complaintRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/users")
    public List<AdminUserResponse> getUsers() {
        return userRepository.findAll().stream().map(AdminUserResponse::new).collect(Collectors.toList());
    }

    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email is already registered");
        }
        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new IllegalStateException("Role is not configured")));
        user.setIsActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(new AdminUserResponse(userRepository.save(user)));
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalArgumentException("Email is already registered");
        }
    }

    @PutMapping("/users/{id}/active")
    public AdminUserResponse updateActive(@PathVariable Long id,
                                          @Valid @RequestBody UpdateUserActiveRequest request,
                                          Authentication authentication) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User current = ((com.campus.maintenance.security.CustomUserDetails) authentication.getPrincipal()).getUser();
        if (current.getId().equals(id) && !Boolean.TRUE.equals(request.getActive())) {
            throw new IllegalArgumentException("You cannot deactivate your own admin account");
        }
        user.setIsActive(request.getActive());
        user.setUpdatedAt(LocalDateTime.now());
        return new AdminUserResponse(userRepository.save(user));
    }

    @GetMapping("/stats")
    public Map<String, Long> getStats() {
        List<User> users = userRepository.findAll();
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("totalUsers", (long) users.size());
        stats.put("totalStudents", countRole(users, "STUDENT"));
        stats.put("totalStaff", countRole(users, "STAFF"));
        stats.put("totalWorkers", countRole(users, "WORKER"));
        stats.put("totalComplaints", complaintRepository.count());
        complaintRepository.findAll().forEach(complaint ->
                stats.merge(complaint.getStatus().name(), 1L, Long::sum));
        return stats;
    }

    private long countRole(List<User> users, String role) {
        return users.stream().filter(user -> user.getRole() != null && role.equals(user.getRole().getName())).count();
    }
}
