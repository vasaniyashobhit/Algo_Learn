package com.algolearn.problems;

import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to problems; search and similarity use native queries in later sessions. */
public interface ProblemRepository extends JpaRepository<Problem, String> {
}
