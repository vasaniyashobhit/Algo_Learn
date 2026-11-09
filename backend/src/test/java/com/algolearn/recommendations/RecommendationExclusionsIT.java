package com.algolearn.recommendations;

import static com.algolearn.support.UserData.practice;
import static com.algolearn.support.UserData.stat;
import static com.algolearn.support.UserData.submit;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.recommendations.calc.TargetRange;
import com.algolearn.recommendations.dto.RecommendedProblem;
import com.algolearn.users.UserRepository;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy recommendations.exclusions.test.js. */
class RecommendationExclusionsIT extends RecommendationTestBase {

    RecommendationExclusionsIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            RecommendationService service, UserRepository users, TagCountsCache cache) {
        super(mvc, jdbc, problems, search, service, users, cache);
    }

    @Test
    void excludesSolvedProblemsTheirDiv1Div2CopiesAndPracticeItems() {
        var user = syncedUser(1300).getId();
        stat(jdbc, user, "dp", 6, 0.5, 1400);
        seed(titled("100/A", "Grid Walk", 1500, "dp"), titled("101/C", "GRID WALK", 1600, "dp"),
                titled("104/C", "grid walk", 1600, "dp"), at("110/A", 1500, "dp"), at("111/A", 1600, "dp"),
                at("112/A", 1700, "dp"), at("113/A", 1800, "dp"), at("114/A", 1400, "dp"));
        submit(jdbc, user, "100/A", List.of("dp"), 1500, "OK");
        practice(jdbc, user, "110/A");
        var dp = topicOf(service.getRecommendations(user), "dp");
        assertThat(dp.targetRange()).isEqualTo(new TargetRange(1500, 1700));
        assertThat(problemIds(dp)).containsExactly("104/C", "111/A", "112/A", "113/A", "114/A");
        assertThat(dp.problems().getLast().pickedBy()).isEqualTo("similar_fallback");
        assertThat(dp.problems().subList(0, 2)).extracting(RecommendedProblem::pickedBy)
                .containsExactly("target_range", "target_range");
    }

    @Test
    void neverRecommendsTheSameProblemUnderTwoTopics() {
        var user = syncedUser(1300).getId();
        stat(jdbc, user, "dp", 6, 0.5, 1400);
        stat(jdbc, user, "greedy", 6, 0.5, 1400);
        seed(at("1/A", 1500, "dp", "greedy"), at("2/A", 1500, "greedy"));
        var all = service.getRecommendations(user).data().topics().stream()
                .flatMap(t -> problemIds(t).stream()).toList();
        assertThat(new HashSet<>(all)).hasSameSizeAs(all);
        assertThat(all.stream().filter("1/A"::equals)).hasSize(1);
    }

    @Test
    void answers401AuthInvalidTokenForADeletedAccount() {
        var user = syncedUser(1200);
        users.delete(user);
        assertThatThrownBy(() -> service.getRecommendations(user.getId()))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status().value()).isEqualTo(401);
                    assertThat(e.code().name()).isEqualTo("AUTH_INVALID_TOKEN");
                });
    }
}
