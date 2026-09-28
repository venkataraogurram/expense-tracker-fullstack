package com.example.expensetracker.service;

import com.example.expensetracker.exception.ResourceNotFoundException;
import com.example.expensetracker.model.Category;
import com.example.expensetracker.model.Expense;
import com.example.expensetracker.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@Transactional
public class ExpenseService {

    private final ExpenseRepository repository;

    public ExpenseService(ExpenseRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Expense> list(Category category, LocalDate from, LocalDate to) {
        return repository.search(category, from, to);
    }

    @Transactional(readOnly = true)
    public Expense get(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense " + id + " not found"));
    }

    public Expense create(Expense expense) {
        return repository.save(expense);
    }

    public Expense update(Long id, Expense changes) {
        Expense existing = get(id);
        existing.setTitle(changes.getTitle());
        existing.setAmount(changes.getAmount());
        existing.setCategory(changes.getCategory());
        existing.setDate(changes.getDate());
        existing.setNotes(changes.getNotes());
        return repository.save(existing);
    }

    public void delete(Long id) {
        Expense existing = get(id);
        repository.delete(existing);
    }

    /**
     * Totals for the given filter: overall sum, count, and a per-category breakdown.
     * Computed in Java over the filtered list, which is fine for a personal tracker.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> summary(Category category, LocalDate from, LocalDate to) {
        List<Expense> expenses = repository.search(category, from, to);

        BigDecimal total = BigDecimal.ZERO;
        Map<String, BigDecimal> byCategory = new TreeMap<>();
        for (Expense e : expenses) {
            total = total.add(e.getAmount());
            byCategory.merge(e.getCategory().name(), e.getAmount(), BigDecimal::add);
        }

        return Map.of(
                "total", total,
                "count", expenses.size(),
                "byCategory", byCategory
        );
    }
}
