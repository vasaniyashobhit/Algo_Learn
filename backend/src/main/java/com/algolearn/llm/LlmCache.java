package com.algolearn.llm;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A cached coach answer, keyed {@code problem:<id>} or {@code text:<sha256>}; kept 30 days. */
@Entity
@Table(name = "llm_cache")
@Getter
@Setter
@NoArgsConstructor
public class LlmCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String key;
    private String provider;
    private String model;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> response;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
