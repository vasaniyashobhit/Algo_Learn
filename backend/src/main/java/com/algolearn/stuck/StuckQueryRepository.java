package com.algolearn.stuck;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to stuck queries. */
public interface StuckQueryRepository extends JpaRepository<StuckQuery, UUID> {
}
