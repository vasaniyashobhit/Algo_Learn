package com.algolearn.sync;

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

/**
 * A final-verdict Codeforces submission of a user. Rating and tags are copied from the CF API at
 * sync time, so stats never join with {@code problems}.
 */
@Entity
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private Long cfSubmissionId;
    private UUID userId;
    private String problemId;
    private Integer contestId;

    @Column(name = "idx")
    private String index;

    private Integer problemRating;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> problemTags = new ArrayList<>();

    private String verdict;
    private Instant submittedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
