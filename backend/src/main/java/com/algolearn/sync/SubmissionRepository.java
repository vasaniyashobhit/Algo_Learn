package com.algolearn.sync;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to submissions. */
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    List<Submission> findByUserIdOrderBySubmittedAtDesc(UUID userId);
}
