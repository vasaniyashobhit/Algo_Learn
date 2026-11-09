package com.algolearn.problems.similar;

import static com.algolearn.support.Problems.at;
import static com.algolearn.support.Problems.stub;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.support.ProblemDatabaseTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy similar.fallback.test.js. */
class SimilarFallbackIT extends ProblemDatabaseTest {

    SimilarFallbackIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    @Test
    void widensTheRatingWindowWhenItIsEmpty() {
        seed(at("1/A", 1900, "dp"), at("2/A", 2200, "dp"));
        var result = find(new SimilarRequest(List.of("dp"), 1500, null, List.of(), List.of(), 1, 300));
        assertThat(result.meta()).isEqualTo(new SimilarMeta(Strategy.WIDENED_WINDOW,
                List.of(Strategy.WIDENED_WINDOW), 600, 1500, 1, null));
        assertThat(ids(result.items())).containsExactly("1/A");
    }

    @Test
    void dropsTheRatingFilterRatedBeforeUnrated() {
        seed(at("1/A", null, "dp"), at("2/A", 3000, "dp"));
        var result = find(List.of("dp"), 1000, 10);
        assertThat(result.meta().strategy()).isEqualTo(Strategy.NO_RATING_FILTER);
        assertThat(ids(result.items())).containsExactly("2/A", "1/A");
    }

    @Test
    void untaggedInputUsesThe200BandSortedByCloseness() {
        seed(at("1/A", 1600, "math"), at("2/A", 1450), at("3/A", 1800, "dp"));
        var result = find(List.of(), 1500, 2);
        assertThat(result.meta().strategy()).isEqualTo(Strategy.RATING_BAND);
        assertThat(result.meta().ratingWindow()).isEqualTo(200);
        assertThat(ids(result.items())).containsExactly("2/A", "1/A");
    }

    @Test
    void onlySpecialCountsAsUntagged() {
        seed(at("1/A", 1500, "*special"));
        assertThat(find(List.of("*special"), 1500, 10).meta().strategy()).isEqualTo(Strategy.RATING_BAND);
    }

    @Test
    void noTagMatchesNearestToTheProblemRatingUnratedLast() {
        seed(at("1/A", 1000, "math"), at("2/A", 1600, "math"), stub("3/A", null, "math"));
        var result = find(List.of("flows"), 1500, 10);
        assertThat(result.meta().strategy()).isEqualTo(Strategy.NEAR_USER_RATING);
        assertThat(result.meta().targetRating()).isEqualTo(1500);
        assertThat(ids(result.items())).containsExactly("2/A", "1/A", "3/A");
    }

    @Test
    void prefersTheUserRatingWhenGiven() {
        seed(at("1/A", 1000, "math"), at("2/A", 1600, "math"));
        var result = find(new SimilarRequest(List.of("flows"), 1500, 1000, List.of(), List.of(), 10, null));
        assertThat(result.meta().targetRating()).isEqualTo(1000);
        assertThat(ids(result.items())).containsExactly("1/A", "2/A");
    }

    @Test
    void untaggedAndUnratedInputUsesTheDefaultTarget() {
        seed(at("1/A", 2000, "dp", "greedy"), at("2/A", 1300, "dp", "greedy"));
        var result = find(SimilarRequest.of(null, null));
        assertThat(result.meta().strategy()).isEqualTo(Strategy.NEAR_USER_RATING);
        assertThat(result.meta().targetRating()).isEqualTo(1200);
        assertThat(ids(result.items())).containsExactly("2/A", "1/A");
    }

    @Test
    void onlyComesBackEmptyWhenNothingIsLeft() {
        seed(at("1/A"));
        var result = find(new SimilarRequest(List.of("dp"), 1200, null, List.of("1/A"), List.of(), 10, null));
        assertThat(result.items()).isEmpty();
        assertThat(result.meta().strategy()).isEqualTo(Strategy.NEAR_USER_RATING);
        assertThat(result.meta().count()).isZero();
    }
}
