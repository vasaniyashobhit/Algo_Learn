package com.algolearn.problems;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.algolearn.e2e.E2eProblems;
import com.algolearn.importer.ProblemWriter;
import com.algolearn.support.DatabaseTest;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * {@link TextScore} gives the legacy text score. Expected numbers were read from the legacy database (its text index,
 * title 3 / description 1) over the same 24 E2E problems; tied scores are compared as a set.
 */
class TextScoreIT extends DatabaseTest {

    private final NamedParameterJdbcTemplate named;

    TextScoreIT(MockMvc mvc, JdbcTemplate jdbc, NamedParameterJdbcTemplate named) {
        super(mvc, jdbc);
        this.named = named;
    }

    @BeforeEach
    void seed() {
        new ProblemWriter(jdbc, Clock.systemUTC())
                .upsert(E2eProblems.docs(), ProblemWriter.Mode.OVERWRITE, 500, b -> { });
    }

    private Map<String, Double> scores(String q) {
        var sql = "SELECT id, " + TextScore.SQL + " AS score FROM problems "
                + "WHERE " + TextScore.MATCH;
        var params = new MapSqlParameterSource("q", ProblemListQueries.anyWord(q));
        return Map.copyOf(named.query(sql, params, (rs, i) -> Map.entry(rs.getString("id"), rs.getDouble("score")))
                .stream().collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
    }

    @Test
    void scoresATitleWordLikeTheLegacyIndex() {
        var scores = scores("brackets");
        assertThat(scores).hasSize(3);
        assertThat(scores.get("1516/A")).isCloseTo(3.5833333333333335, within(1e-9));
        assertThat(scores.get("1500/A")).isCloseTo(2.8333333333333335, within(1e-9));
        assertThat(scores.get("1523/A")).isCloseTo(2.821428571428571, within(1e-9));
    }

    @Test
    void sumsTheQueryTermsOverBothFields() {
        assertThat(scores("balanced bracket sequence").get("1500/A")).isCloseTo(6.194444444444444, within(1e-9));
        var coins = scores("AI OUTAGE Greedy coins: pay n with the fewest coins.");
        assertThat(coins.get("1511/A")).isCloseTo(6.2142857142857135, within(1e-9));
        assertThat(coins.get("1516/A")).isCloseTo(0.5833333333333334, within(1e-9));
        for (var tied : List.of("1505/A", "1507/A", "1518/A", "1521/A", "1509/A", "1510/A")) {
            assertThat(coins.get(tied)).as(tied).isCloseTo(0.5714285714285714, within(1e-9));
        }
        var question = scores("given numbers answer the question");
        assertThat(question.get("1504/A")).isCloseTo(4.625, within(1e-9));
        assertThat(question.get("1516/A")).isCloseTo(2.3333333333333335, within(1e-9));
        assertThat(question.get("1521/A")).isCloseTo(2.2857142857142856, within(1e-9));
    }

    @Test
    void boostsAFieldThatIsExactlyTheTerm() {
        jdbc.update("UPDATE problems SET title = 'dp' WHERE id = '1502/A'");
        // title "dp" alone: 3 * 1 * (0.5 + 0.5) * 1.1; description has no "dp".
        assertThat(scores("dp").get("1502/A")).isCloseTo(3.3, within(1e-9));
    }

    @Test
    void usesTheLegacyStopWordsNotPostgres() {
        jdbc.update("UPDATE problems SET title = 'Can Opener Now' WHERE id = '1502/A'");
        // "can" and "now" are words for the legacy index (Postgres drops them); "would" and "the" are not.
        assertThat(scores("can").get("1502/A")).isCloseTo(3 * (0.5 / 3 + 0.5), within(1e-9));
        assertThat(scores("would the")).isEmpty();
        assertThat(scores("two-pointers")).as("parts only, like the legacy index").isEqualTo(scores("two pointers"))
                .containsOnlyKeys("1519/A");
    }
}
