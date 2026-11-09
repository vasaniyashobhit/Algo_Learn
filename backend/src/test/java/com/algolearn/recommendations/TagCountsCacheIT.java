package com.algolearn.recommendations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.recommendations.calc.TopicFrequency.TagCountRow;
import com.algolearn.users.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy tagCounts.cache.test.js. */
class TagCountsCacheIT extends RecommendationTestBase {

    TagCountsCacheIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            RecommendationService service, UserRepository users, TagCountsCache cache) {
        super(mvc, jdbc, problems, search, service, users, cache);
    }

    @Test
    void countsRatedProblemsPerRatingAndTopicTag() {
        seed(at("1/A", 1200, "dp", "*special"), at("2/A", 1200, "dp", "math"), at("3/A", 1500),
                at("4/A", null, "dp"));
        assertThat(cache.get()).containsExactly(new TagCountRow(1200, 2, Map.of("dp", 2L, "math", 1L)),
                new TagCountRow(1500, 1, Map.of()));
    }

    @Test
    void runsTheQueryOncePerHourSharedByConcurrentCallers() {
        var counting = spy(new TagCountsQueries(jdbc));
        var hourly = new TagCountsCache(counting, clock);
        clock.set(Instant.EPOCH);
        CompletableFuture.allOf(CompletableFuture.runAsync(hourly::get), CompletableFuture.runAsync(hourly::get))
                .join();
        clock.set(Instant.EPOCH.plusMillis(3_599_999));
        hourly.get();
        verify(counting, times(1)).load();
        clock.set(Instant.EPOCH.plus(Duration.ofHours(1)));
        hourly.get();
        verify(counting, times(2)).load();
        hourly.clear();
        hourly.get();
        verify(counting, times(3)).load();
    }

    @Test
    void doesNotCacheAFailedQuery() {
        var failing = mock(TagCountsQueries.class);
        when(failing.load()).thenThrow(new DataAccessResourceFailureException("db down")).thenReturn(List.of());
        var once = new TagCountsCache(failing, clock);
        assertThatThrownBy(once::get).hasMessage("db down");
        assertThat(once.get()).isEmpty();
        verify(failing, times(2)).load();
    }
}
