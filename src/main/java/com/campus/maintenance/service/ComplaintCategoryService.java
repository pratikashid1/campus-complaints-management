package com.campus.maintenance.service;

import com.campus.maintenance.entity.ComplaintCategory;
import com.campus.maintenance.repository.ComplaintCategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComplaintCategoryService {

    private final ComplaintCategoryRepository categoryRepository;

    public ComplaintCategoryService(ComplaintCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<ComplaintCategory> getAllCategories() {
        return categoryRepository.findAll();
    }

    public List<ComplaintCategory> getActiveCategories() {
        return categoryRepository.findByIsActiveTrue();
    }

    public ComplaintCategory getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
    }

    public ComplaintCategory createCategory(ComplaintCategory category) {
        return categoryRepository.save(category);
    }

    public ComplaintCategory updateCategory(Long id, ComplaintCategory updatedCategory) {
        ComplaintCategory category = getCategoryById(id);
        category.setName(updatedCategory.getName());
        category.setDescription(updatedCategory.getDescription());
        category.setIsActive(updatedCategory.getIsActive());
        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        getCategoryById(id);
        categoryRepository.deleteById(id);
    }
}
