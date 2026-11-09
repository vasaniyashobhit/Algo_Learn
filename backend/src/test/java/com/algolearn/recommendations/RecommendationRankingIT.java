package com.algolearn.recommendations;

import static com.algolearn.support.UserData.stat;
import static com.algolearn.support.UserData.submit;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.problems.similar.SimilarSearch.SimilarResult;
import com.algolearn.problems.similar.SimilarityQueries;
import com.algolearn.recommendations.calc.TargetRange;
import com.algolearn.recommendations.dto.RecommendedProblem;
import com.algolearn.recommendations.dto.RecommendedTopic;
import com.algolearn.recommendations.dto.Recommendations;
import com.algolearn.users.UserRepository;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy recommendations.ranking.test.js. */
class RecommendationRankingIT extends RecommendationTestBase {

    private final ContextLoader loader;
    private final RecommendationQueries queries;
    private final SimilarityQueries similarity;

    RecommendationRankingIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            RecommendationService service, UserRepository users, TagCountsCache cache, ContextLoader loader,
            RecommendationQueries queries, SimilarityQueries similarity) {
        super(mvc, jdbc, problems, search, service, users, cache);
        this.loader = loader;
        this.queries = queries;
        this.similarity = similarity;
    }

    @Test
    void ranksByMaxJaccardToTheRecentFailuresTiesByRatingAscending() {
        var user = syncedUser(1300).getId();
        stat(jdbc, user, "dp", 6, 0.5, 1400);
        seed(at("1/A", 1500, "dp"), at("2/A", 1700, "dp", "graphs"), at("3/A", 1600, "dp", "graphs", "trees"),
                at("4/A", 1600, "dp", "math"), at("5/A", 1500, "dp", "math"));
        submit(jdbc, user, "90/A", List.of("dp", "graphs"), 1500, "WRONG_ANSWER", 2);
        submit(jdbc, user, "91/A", List.of("math"), 1500, "WRONG_ANSWER", 1);
        var result = service.getRecommendations(user);
        var dp = topicOf(result, "dp");
        assertThat(problemIds(dp)).containsExactly("2/A", "3/A", "1/A", "5/A", "4/A");
        assertThat(dp.problems()).extracting(RecommendedProblem::similarityToFailed)
                .containsExactly(1.0, 0.6667, 0.5, 0.5, 0.5);
        assertThat(result.meta()).isEqualTo(new Recommendations.Meta(1300, 1300, false, 2, null));
    }

    @Test
    void fillsAShortPoolThroughFindSimilarWithTheTargetRangeAsItsWindow() {
        var user = syncedUser(1300).getId();
        stat(jdbc, user, "dp", 6, 0.5, 1400);
        seed(at("1/A", 1600, "dp"), at("2/A", 2000, "dp"), at("3/A", 1600, "math"));
        var calls = new ArrayList<SimilarRequest>();
        var spy = new SimilarSearch(similarity) {
            @Override
            public SimilarResult find(SimilarRequest request) {
                calls.add(request);
                return super.find(request);
            }
        };
        var dp = topicOf(new RecommendationService(loader, queries, spy).getRecommendations(user), "dp");
        assertThat(problemIds(dp)).containsExactly("1/A", "2/A", "3/A");
        assertThat(dp.problems()).extracting(RecommendedProblem::pickedBy)
                .containsExactly("target_range", "similar_fallback", "similar_fallback");
        var first = calls.getFirst();
        assertThat(first.tags()).containsExactly("dp");
        assertThat(first.rating()).isEqualTo(1600);
        assertThat(first.ratingWindow()).isEqualTo(100);
        assertThat(first.userRating()).isEqualTo(1300);
        assertThat(first.excludeIds()).containsExactly("1/A");
        assertThat(first.k()).isEqualTo(9);
    }

    @Test
    void coldStartWithoutAHandleFrequentTagsAt1200NeverBlank() {
        var user = users.save(com.algolearn.support.Users.user()).getId();
        seed(at("1/A", 1200, "math"), at("2/A", 1300, "math", "greedy"), at("3/A", 2500, "math"));
        var result = service.getRecommendations(user);
        assertThat(result.data().topics()).extracting(RecommendedTopic::topic)
                .containsExactly("math", "greedy", "2-sat");
        var math = result.data().topics().getFirst();
        assertThat(math.basis()).isEqualTo("frequent");
        assertThat(math.targetRange()).isEqualTo(new TargetRange(1300, 1500));
        assertThat(math.reason()).isEqualTo("New topic for you: math shows up in 100% of problems rated around 1200");
        assertThat(problemIds(math)).containsExactly("2/A", "1/A", "3/A");
        assertThat(result.meta()).isEqualTo(new Recommendations.Meta(null, 1200, true, 0, "NO_HANDLE"));
    }
}
