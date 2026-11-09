package com.algolearn.practice;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to practice items. */
public interface PracticeItemRepository extends JpaRepository<PracticeItem, UUID> {
}
