package com.algolearn.stuck;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One "I'm stuck" request and its answer. {@code result} and {@code solution} are free-form JSON;
 * the full solution is served only by GET /stuck/:id/solution.
 */
@Entity
@Table(name = "stuck_queries")
@Getter
@Setter
@NoArgsConstructor
public class StuckQuery {

    /** Longest stored raw input; longer input is cut (legacy truncateRawInput). */
    public static final int RAW_INPUT_MAX = 20_000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;
    private String inputType;
    private String rawInput = "";
    private String matchedProblemId;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> detectedTags = new ArrayList<>();

    private String tagsSource;
    private Integer estimatedRating;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<GapItem> gap = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> result;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> solution;

    private String source;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    /** Keeps at most {@link #RAW_INPUT_MAX} characters; null stays null. */
    public static String truncateRawInput(String value) {
        return value == null || value.length() <= RAW_INPUT_MAX ? value : value.substring(0, RAW_INPUT_MAX);
    }

    /** Stores the input cut to {@link #RAW_INPUT_MAX} characters; null becomes empty. */
    public void setRawInput(String value) {
        this.rawInput = value == null ? "" : truncateRawInput(value);
    }
}
