package com.algolearn.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.support.DatabaseTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Flyway schema: checks, defaults, indexes and full-text weights (legacy problem model/index tests). */
class SchemaIT extends DatabaseTest {

    private static final Class<DataIntegrityViolationException> BAD = DataIntegrityViolationException.class;

    private final ProblemRepository problems;

    SchemaIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems) {
        super(mvc, jdbc);
        this.problems = problems;
    }

    @Test
    void appliesBothMigrations() {
        assertThat(jdbc.queryForList(
                "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank", String.class))
                .containsExactly("1", "2");
    }

    @Test
    void appliesDefaultsNullRatingEmptyTextsAndTagsSourceHf() {
        jdbc.update("INSERT INTO problems (id, contest_id, idx, title) VALUES ('2/B', 2, 'B', 'T')");
        var row = problems.findById("2/B").orElseThrow();
        assertThat(row.getRating()).isNull();
        assertThat(List.of(row.getDescription(), row.getEditorial(), row.getNote())).containsOnly("");
        assertThat(row.getTags()).isEmpty();
        assertThat(row.getTagCount()).isZero();
        assertThat(row.isHasEditorial()).isFalse();
        assertThat(row.getSource()).isEqualTo("hf");
    }

    @Test
    void acceptsMultiPartIndexesTheUnusualDatasetIdsAndSpecial() {
        for (var id : List.of("1950/F2", "1723/GP1", "1723/GP2", "921/01", "921/02")) {
            insertProblem(id, "hf", "T", 1500, "*special");
        }
        assertThat(problems.count()).isEqualTo(5);
    }

    @Test
    void rejectsMalformedIdsUnknownTagsBadSourcesAndOutOfRangeRatings() {
        var badId = "INSERT INTO problems (id, contest_id, idx, title) VALUES ('1A', 1, 'A', 'T')";
        assertThatThrownBy(() -> jdbc.update(badId)).isInstanceOf(BAD);
        assertThatThrownBy(() -> insertProblem("1/ABCD", "hf", "T", null))
                .isInstanceOf(BAD);
        assertThatThrownBy(() -> insertProblem("1/a", "hf", "T", null)).isInstanceOf(BAD);
        assertThatThrownBy(() -> insertProblem("1/A", "hf", "T", null, "dp", "magic"))
                .isInstanceOf(BAD);
        assertThatThrownBy(() -> insertProblem("1/A", "scraped", "T", null))
                .isInstanceOf(BAD);
        assertThatThrownBy(() -> insertProblem("1/A", "hf", "T", 9000)).isInstanceOf(BAD);
    }

    @Test
    void hasTheGinBtreeAndUserTimelineIndexes() {
        var indexes = jdbc.queryForList(
                "SELECT indexname || ' ' || indexdef FROM pg_indexes WHERE schemaname = 'public'", String.class);
        assertThat(indexes).anyMatch(i -> i.startsWith("ix_problems_tags ") && i.contains("USING gin (tags)"))
                .anyMatch(i -> i.startsWith("ix_problems_search ") && i.contains("USING gin (search)"))
                .anyMatch(i -> i.startsWith("ix_problems_rating ") && i.contains("btree (rating)"))
                .anyMatch(i -> i.startsWith("ix_submissions_user_submitted ") && i.contains("submitted_at DESC"))
                .anyMatch(i -> i.startsWith("ix_stuck_queries_user_created ") && i.contains("created_at DESC"))
                .anyMatch(i -> i.startsWith("ix_practice_items_user_created "))
                .anyMatch(i -> i.startsWith("uk_users_cf_handle ") && i.contains("UNIQUE") && i.contains("lower"));
    }

    @Test
    void ranksATitleMatchAboveADescriptionOnlyMatch() {
        jdbc.update("INSERT INTO problems (id, contest_id, idx, title, description) VALUES "
                + "('1/A', 1, 'A', 'Fence', 'Use a segment tree for painting.'), "
                + "('2/A', 2, 'A', 'Segment painting', 'Paint the fence.')");
        var titles = jdbc.queryForList("SELECT title FROM problems WHERE search @@ plainto_tsquery('english', ?) "
                + "ORDER BY ts_rank(search, plainto_tsquery('english', ?)) DESC", String.class, "segment", "segment");
        assertThat(titles).containsExactly("Segment painting", "Fence");
    }
}
