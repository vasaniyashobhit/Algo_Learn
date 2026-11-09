package com.algolearn.stats;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/** Strength of one user in one topic: a single tag ({@code dp}) or a sorted pair ({@code bitmasks+dp}). */
@Entity
@Table(name = "topic_stats")
@Getter
@Setter
@NoArgsConstructor
public class TopicStat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;
    private String topicKey;
    private String kind;
    private int attempted;
    private int solved;
    private int failed;
    private Double avgSolvedRating;
    private Double maxSolvedRating;
    private Double comfortRating;
    private double strength;
    private Instant lastActivityAt;

    /** The newest attempted problems in this topic, newest first (the dashboard "Last 5" marks). */
    @JdbcTypeCode(SqlTypes.JSON)
    private List<LastResult> lastResults = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
