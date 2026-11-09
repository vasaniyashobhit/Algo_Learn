package com.algolearn.problems;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * A Codeforces problem (id {@code <contestId>/<index>}). Imported rows have source "hf" with
 * statement text; rows added by the problemset sync have source "cf_api" and empty text.
 * The generated {@code search} tsvector column is read only by native queries.
 */
@Entity
@Table(name = "problems")
@Getter
@Setter
@NoArgsConstructor
public class Problem {

    @Id
    private String id;

    private Integer contestId;

    @Column(name = "idx")
    private String index;

    private String title;
    private String description = "";
    private String inputFormat = "";
    private String outputFormat = "";
    private String note = "";
    private String editorial = "";
    private Integer rating;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> tags = new ArrayList<>();

    private int tagCount;
    private boolean hasEditorial;
    private String source = "hf";

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
