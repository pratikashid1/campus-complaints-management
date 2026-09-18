package com.campus.maintenance.controller;

import com.campus.maintenance.dto.CreateCategoryRequest;
import com.campus.maintenance.entity.ComplaintCategory;
import com.campus.maintenance.service.ComplaintCategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/categories")
public class ComplaintCategoryController {

    private final ComplaintCategoryService categoryService;

    public ComplaintCategoryController(ComplaintCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<ComplaintCategory> getAllCategories() {
        return categoryService.getAllCategories();
    }

    @GetMapping("/active")
    public List<ComplaintCategory> getActiveCategories() {
        return categoryService.getActiveCategories();
    }

    @GetMapping("/{id}")
    public ComplaintCategory getCategoryById(@PathVariable Long id) {
        return categoryService.getCategoryById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComplaintCategory> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.createCategory(toCategory(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ComplaintCategory updateCategory(@PathVariable Long id,
                                            @Valid @RequestBody CreateCategoryRequest request) {
        return categoryService.updateCategory(id, toCategory(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    private ComplaintCategory toCategory(CreateCategoryRequest request) {
        ComplaintCategory category = new ComplaintCategory();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setIsActive(request.getIsActive());
        return category;
    }
}
