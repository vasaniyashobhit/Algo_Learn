package com.algolearn.problems.similar;

import static com.algolearn.support.Problems.at;
import static com.algolearn.support.Problems.titled;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.support.ProblemDatabaseTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy similar.fillup.test.js. */
class SimilarFillUpIT extends ProblemDatabaseTest {

    SimilarFillUpIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    @Test
    void fillsTheFreeSlotsFromLaterStrategiesEarlierResultsFirst() {
        seed(at("1/A", 1500, "dp"), at("2/A", 2000, "dp"), at("3/A", 2600, "dp"), at("4/A", 1500, "math"));
        var result = find(List.of("dp"), 1500, 4);
        assertThat(ids(result.items())).containsExactly("1/A", "2/A", "3/A", "4/A");
        assertThat(result.meta()).isEqualTo(new SimilarMeta(Strategy.PRIMARY, List.of(Strategy.PRIMARY,
                Strategy.WIDENED_WINDOW, Strategy.NO_RATING_FILTER, Strategy.NEAR_USER_RATING), 300, 1500, 4, null));
    }

    @Test
    void neverRepeatsAProblemAndStopsOnceKAreFound() {
        seed(at("1/A", 1500, "dp"), at("2/A", 1550, "dp"), at("3/A", 1900, "dp"), at("4/A", 2000, "dp"));
        var result = find(List.of("dp"), 1500, 3);
        assertThat(ids(result.items())).containsExactly("1/A", "2/A", "3/A");
        assertThat(result.meta().strategies()).containsExactly(Strategy.PRIMARY, Strategy.WIDENED_WINDOW);
    }

    @Test
    void keepsTheCallerExclusionsInEveryStrategy() {
        seed(at("1/A", 1500, "dp"), at("2/A", 1500, "math"), titled("Same", at("3/A", 1500, "math")));
        var result = find(new SimilarRequest(List.of("dp"), 1500, null, List.of("2/A"), List.of("Same"), 10, null));
        assertThat(ids(result.items())).containsExactly("1/A");
    }

    @Test
    void reportsTheLastStrategyWhenNothingIsFound() {
        var result = find(List.of("dp"), 1500, 10);
        assertThat(result.items()).isEmpty();
        assertThat(result.meta()).isEqualTo(new SimilarMeta(Strategy.NEAR_USER_RATING, List.of(), 300, 1500, 0, null));
    }

    @Test
    void eachItemIsScoredWithItsOwnAttemptsWindow() {
        seed(at("1/A", 1500, "dp"), at("2/A", 1950, "dp"));
        var items = find(List.of("dp"), 1500, 2).items();
        assertThat(items.get(1).similarity().ratingCloseness()).isEqualTo(1 - 450.0 / 600);
    }
}
