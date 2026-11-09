package com.algolearn.stats;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to topic stats. */
public interface TopicStatRepository extends JpaRepository<TopicStat, UUID> {

    List<TopicStat> findByUserId(UUID userId);
}
