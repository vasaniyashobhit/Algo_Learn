package com.algolearn.llm;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to the LLM cache. */
public interface LlmCacheRepository extends JpaRepository<LlmCache, UUID> {

    Optional<LlmCache> findByKey(String key);
}
