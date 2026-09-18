package com.campus.maintenance.controller;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/login")
    public String login(Authentication authentication) {
        return isAuthenticated(authentication) ? redirectFor(authentication) : "login";
    }

    @GetMapping("/register")
    public String register(Authentication authentication) {
        return isAuthenticated(authentication) ? redirectFor(authentication) : "register";
    }

    @GetMapping({"/", "/dashboard"})
    public String dashboard(Authentication authentication) {
        if (!isAuthenticated(authentication)) {
            return "redirect:/login";
        }
        return isAdmin(authentication) ? "redirect:/admin/dashboard"
                : isStaff(authentication) ? "redirect:/staff/dashboard"
                : isWorker(authentication) ? "redirect:/worker/dashboard"
                : isStudent(authentication) ? "redirect:/student/dashboard" : "dashboard";
    }

    @GetMapping("/student/dashboard")
    public String studentDashboard(Authentication authentication) {
        return isStudent(authentication) ? "student-dashboard" : redirectFor(authentication);
    }

    @GetMapping("/student/complaints")
    public String studentComplaints(Authentication authentication) {
        return isStudent(authentication) ? "student-complaints" : redirectFor(authentication);
    }

    @GetMapping("/student/complaints/new")
    public String newComplaint(Authentication authentication) {
        return isStudent(authentication) ? "student-complaint-form" : redirectFor(authentication);
    }

    @GetMapping("/student/complaints/{id}")
    public String complaintDetails(Authentication authentication) {
        return isStudent(authentication) ? "student-complaint-details" : redirectFor(authentication);
    }

    @GetMapping("/student/profile")
    public String studentProfile(Authentication authentication) {
        return isStudent(authentication) ? "student-profile" : redirectFor(authentication);
    }

    @GetMapping("/staff/dashboard")
    public String staffDashboard(Authentication authentication) {
        return isStaff(authentication) ? "staff-dashboard" : redirectFor(authentication);
    }

    @GetMapping("/staff/complaints")
    public String staffComplaints(Authentication authentication) {
        return isStaff(authentication) ? "staff-complaints" : redirectFor(authentication);
    }

    @GetMapping("/staff/complaints/{id}")
    public String staffComplaintDetails(Authentication authentication) {
        return isStaff(authentication) ? "staff-complaint-details" : redirectFor(authentication);
    }

    @GetMapping("/staff/profile")
    public String staffProfile(Authentication authentication) {
        return isStaff(authentication) ? "staff-profile" : redirectFor(authentication);
    }

    @GetMapping("/worker/dashboard")
    public String workerDashboard(Authentication authentication) {
        return isWorker(authentication) ? "worker-dashboard" : redirectFor(authentication);
    }

    @GetMapping("/worker/complaints")
    public String workerComplaints(Authentication authentication) {
        return isWorker(authentication) ? "worker-complaints" : redirectFor(authentication);
    }

    @GetMapping("/worker/complaints/{id}")
    public String workerComplaintDetails(Authentication authentication) {
        return isWorker(authentication) ? "worker-complaint-details" : redirectFor(authentication);
    }

    @GetMapping("/worker/profile")
    public String workerProfile(Authentication authentication) {
        return isWorker(authentication) ? "worker-profile" : redirectFor(authentication);
    }

    @GetMapping("/admin/dashboard")
    public String adminDashboard(Authentication authentication) {
        return isAdmin(authentication) ? "admin-dashboard" : redirectFor(authentication);
    }

    @GetMapping("/admin/users")
    public String adminUsers(Authentication authentication) {
        return isAdmin(authentication) ? "admin-users" : redirectFor(authentication);
    }

    @GetMapping("/admin/users/new")
    public String adminNewUser(Authentication authentication) {
        return isAdmin(authentication) ? "admin-user-form" : redirectFor(authentication);
    }

    @GetMapping("/admin/complaints")
    public String adminComplaints(Authentication authentication) {
        return isAdmin(authentication) ? "admin-complaints" : redirectFor(authentication);
    }

    @GetMapping("/admin/complaints/{id}")
    public String adminComplaintDetails(Authentication authentication) {
        return isAdmin(authentication) ? "admin-complaint-details" : redirectFor(authentication);
    }

    @GetMapping("/admin/categories")
    public String adminCategories(Authentication authentication) {
        return isAdmin(authentication) ? "admin-categories" : redirectFor(authentication);
    }

    @GetMapping("/admin/locations")
    public String adminLocations(Authentication authentication) {
        return isAdmin(authentication) ? "admin-locations" : redirectFor(authentication);
    }

    @GetMapping("/admin/profile")
    public String adminProfile(Authentication authentication) {
        return isAdmin(authentication) ? "admin-profile" : redirectFor(authentication);
    }

    private boolean isAdmin(Authentication authentication) {
        return isAuthenticated(authentication) && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private boolean isStudent(Authentication authentication) {
        return isAuthenticated(authentication)
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_STUDENT".equals(authority.getAuthority()));
    }

    private boolean isStaff(Authentication authentication) {
        return isAuthenticated(authentication)
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_STAFF".equals(authority.getAuthority())
                        || "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private boolean isWorker(Authentication authentication) {
        return isAuthenticated(authentication)
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_WORKER".equals(authority.getAuthority()));
    }

    private String redirectFor(Authentication authentication) {
        if (!isAuthenticated(authentication)) {
            return "redirect:/login";
        }
        return isAdmin(authentication) ? "redirect:/admin/dashboard"
                : isStaff(authentication) ? "redirect:/staff/dashboard"
                : isWorker(authentication) ? "redirect:/worker/dashboard"
                : isStudent(authentication) ? "redirect:/student/dashboard" : "redirect:/dashboard";
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal());
    }
}
