package com.algolearn.problems.similar;

import static com.algolearn.support.Problems.at;
import static com.algolearn.support.Problems.stub;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.algolearn.problems.Problem;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.support.ProblemDatabaseTest;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy similar.pipeline.test.js: the one native query, scores and ordering (primary attempt). */
class SimilarPipelineIT extends ProblemDatabaseTest {

    private static final List<String> TAGS = List.of("dp", "greedy");

    SimilarPipelineIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    @BeforeEach
    void seedProblems() {
        seed(at("10/A", 1500, "dp", "greedy"), at("11/A", 1650, "dp", "greedy"), at("12/A", 1500, "dp"),
                at("13/A", 1500, "dp", "greedy", "*special"), at("14/A", 1500, "math"), at("15/A", 2000, "dp"),
                stub("2000/C", 1400, "greedy"));
    }

    private static SimilarRequest request(int k, List<String> excludeIds, List<String> excludeTitles) {
        return new SimilarRequest(TAGS, 1500, null, excludeIds, excludeTitles, k, null);
    }

    @Test
    void ranksByScoreThenIdInsideTheTagAndRatingFilters() {
        var result = find(TAGS, 1500, 5);
        assertThat(ids(result.items())).containsExactly("10/A", "13/A", "11/A", "12/A", "2000/C");
        assertThat(result.meta()).isEqualTo(new SimilarMeta(Strategy.PRIMARY, List.of(Strategy.PRIMARY), 300, 1500,
                5, null));
    }

    @Test
    void computesTheSameScoresAsTheJavaHelpers() {
        find(TAGS, 1500, 5).items().forEach(item -> {
            var j = SimilarityMath.jaccard(TAGS, item.tags());
            var c = SimilarityMath.ratingCloseness(1500.0, item.rating().doubleValue(), 300);
            assertThat(item.similarity().jaccard()).isCloseTo(j, within(1e-10));
            assertThat(item.similarity().ratingCloseness()).isCloseTo(c, within(1e-10));
            assertThat(item.similarity().score()).isEqualTo(SimilarityMath.score(j, c));
        });
    }

    @Test
    void includesCfApiRowsWithoutAStatement() {
        var stubRow = find(TAGS, 1500, 5).items().stream().filter(i -> i.id().equals("2000/C")).findFirst();
        assertThat(stubRow).hasValueSatisfying(row -> {
            assertThat(row.source()).isEqualTo("cf_api");
            assertThat(row.hasEditorial()).isFalse();
            assertThat(row.title()).isEqualTo("Stub 2000/C");
        });
    }

    @Test
    void excludesIdsAndExactTitlesAndLimitsToK() {
        var result = find(request(3, List.of("10/A"), List.of("Title 13/A")));
        assertThat(ids(result.items())).containsExactly("11/A", "12/A", "2000/C");
        assertThat(ids(find(TAGS, 1500, 2).items())).containsExactly("10/A", "13/A");
    }

    @Test
    void ignoresSpecialAndUnknownTagsInTheInput() {
        var result = find(List.of("dp", "greedy", "*special", "nope"), 1500, 5);
        assertThat(result.items().getFirst().similarity().jaccard()).isEqualTo(1);
    }

    @Test
    void withoutARatingUsesTagsOnlyRankedByJaccard() {
        var result = find(TAGS, null, 6);
        assertThat(result.meta().strategy()).isEqualTo(Strategy.PRIMARY);
        assertThat(result.meta().targetRating()).isNull();
        assertThat(ids(result.items())).containsExactly("10/A", "11/A", "13/A", "12/A", "15/A", "2000/C");
    }

    @Test
    void neverReturnsMoreThan30() {
        jdbc.execute("TRUNCATE problems");
        seed(IntStream.range(0, 35)
                .mapToObj(i -> at((100 + i) + "/A", 1200, "dp")).toArray(Problem[]::new));
        assertThat(find(List.of("dp"), 1200, 100).items()).hasSize(30);
    }
}
