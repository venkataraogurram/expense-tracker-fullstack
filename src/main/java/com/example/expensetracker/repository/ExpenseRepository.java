package com.example.expensetracker.repository;

import com.example.expensetracker.model.Category;
import com.example.expensetracker.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    /**
     * Returns expenses matching the optional filters, newest first.
     * A null filter value means "don't filter on this field".
     */
    @Query("""
            SELECT e FROM Expense e
            WHERE (:category IS NULL OR e.category = :category)
              AND (:from IS NULL OR e.date >= :from)
              AND (:to IS NULL OR e.date <= :to)
            ORDER BY e.date DESC, e.id DESC
            """)
    List<Expense> search(@Param("category") Category category,
                         @Param("from") LocalDate from,
                         @Param("to") LocalDate to);
}
