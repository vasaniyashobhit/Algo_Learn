package com.algolearn.recommendations;

import static com.algolearn.support.UserData.practice;
import static com.algolearn.support.UserData.stat;
import static com.algolearn.support.UserData.submit;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.practice.PracticeQueries;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.recommendations.calc.FailedProblem;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import com.algolearn.recommendations.calc.TopicFrequency.TagCountRow;
import com.algolearn.stats.StatsQueries;
import com.algolearn.stats.calc.TopicStatDoc;
import com.algolearn.users.UserRepository;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy recommendations.context.test.js (tag counts injected). */
class ContextLoaderIT extends RecommendationTestBase {

    private final ContextLoader load;

    ContextLoaderIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            RecommendationService service, UserRepository users, TagCountsCache cache, StatsQueries stats,
            PracticeQueries practice, RecommendationQueries queries) {
        super(mvc, jdbc, problems, search, service, users, cache);
        var tagQueries = mock(TagCountsQueries.class);
        when(tagQueries.load()).thenReturn(List.of(new TagCountRow(1500, 4, Map.of("dp", 1L))));
        load = new ContextLoader(users, stats, practice, queries, new TagCountsCache(tagQueries, Clock.systemUTC()));
    }

    @Test
    void collectsStatsFrequencyFailuresAndExclusionsOfOneUser() {
        var user = syncedUser(1500).getId();
        seed(titled("5/A", "Twin", 1200, "dp"));
        stat(jdbc, user, "dp", 4, 0.5, null);
        submit(jdbc, user, "5/A", List.of("dp"), 1500, "OK");
        submit(jdbc, user, "8/B", List.of("dp"), 1500, "OK");
        submit(jdbc, user, "9/A", List.of("math"), 1500, "WRONG_ANSWER");
        practice(jdbc, user, "5/A");
        practice(jdbc, user, "20/A");
        var ctx = load.load(user);
        assertThat(ctx.userRating()).isEqualTo(1500);
        assertThat(ctx.stats()).extracting(TopicStatDoc::topicKey).containsExactly("dp");
        assertThat(ctx.freq().rating()).isEqualTo(1500);
        assertThat(ctx.freq().total()).isEqualTo(4);
        assertThat(ctx.freq().share("dp")).isEqualTo(0.25);
        assertThat(ctx.recentFailed()).containsExactly(new FailedProblem("9/A", List.of("math")));
        assertThat(ctx.excludeIds()).containsExactlyInAnyOrder("20/A", "5/A", "8/B");
        assertThat(ctx.solvedTitles()).containsExactly("Twin");
        assertThat(ctx.isSolved().test(new ProblemRef("6/C", "TWIN", 6))).isTrue();
        assertThat(ctx.isSolved().test(new ProblemRef("8/B", "x", 8))).isTrue();
    }

    @Test
    void worksForAUserWithNothingYet() {
        var user = syncedUser(null).getId();
        var ctx = load.load(user);
        assertThat(ctx.userRating()).isNull();
        assertThat(ctx.stats()).isEmpty();
        assertThat(ctx.recentFailed()).isEmpty();
        assertThat(ctx.excludeIds()).isEmpty();
        assertThat(ctx.solvedTitles()).isEmpty();
        assertThat(ctx.freq().rating()).isEqualTo(1200);
    }
}
