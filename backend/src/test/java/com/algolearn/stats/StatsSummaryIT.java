package com.algolearn.stats;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.calc.Activity;
import com.algolearn.stats.calc.RatingBands;
import com.algolearn.stats.dto.Summary;
import com.algolearn.stats.dto.SummaryMeta;
import com.algolearn.stats.dto.TopicStatView;
import com.algolearn.users.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stats.summary.service.test.js and stats.lastResults.test.js. */
class StatsSummaryIT extends StatsTestBase {

    StatsSummaryIT(MockMvc mvc, JdbcTemplate jdbc, StatsService service, UserRepository users, StatsQueries queries) {
        super(mvc, jdbc, service, users, queries);
    }

    @Test
    void summarizesASyncedUserAfterARecompute() {
        var id = syncedUser().getId();
        submit(id, "1/A", List.of("dp"), 1200, "WRONG_ANSWER", 1);
        submit(id, "1/A", List.of("dp"), 1200, "OK", 1);
        submit(id, "2/A", List.of("dp", "math"), 1500, "WRONG_ANSWER", 2);
        submit(id, "3/A", List.of("dp", "math"), null, "OK", 40);
        submit(id, "4/A", List.of("math"), 1250, "OK", 0);
        service.recomputeForUser(id);
        var page = service.getSummary(id);
        assertThat(page.meta()).isEqualTo(new SummaryMeta("Ada_L", 1200, "2026-10-29T12:00:00.000Z", null));
        var data = page.data();
        assertThat(data.totals()).isEqualTo(new Summary.Totals(5, 4, 3, 2, 1));
        assertThat(data.strongest().stream().map(TopicStatView::topicKey)).containsExactly("math", "dp");
        assertThat(data.weakest().stream().map(TopicStatView::topicKey)).containsExactly("dp", "math");
        assertThat(data.solvedByRating().bands()).contains(new RatingBands.Band(1200, 1399, 2));
        assertThat(data.solvedByRating().unrated()).isEqualTo(1);
        assertThat(data.activity()).hasSize(30);
        assertThat(data.activity().getLast()).isEqualTo(new Activity.Day("2026-10-29", 1, 1));
        assertThat(data.activity().get(28)).isEqualTo(new Activity.Day("2026-10-28", 2, 1));
    }

    @Test
    void returnsTheZeroFilledShapeWithReasonNoHandle() {
        var page = service.getSummary(syncedUser(null, null, null).getId());
        assertThat(page.meta()).isEqualTo(new SummaryMeta(null, null, null, "NO_HANDLE"));
        assertThat(page.data().totals().submissions()).isZero();
        assertThat(page.data().strongest()).isEmpty();
        assertThat(page.data().weakest()).isEmpty();
        assertThat(page.data().solvedByRating().bands()).hasSize(14);
        assertThat(page.data().activity()).allMatch(day -> day.submissions() == 0);
    }

    @Test
    void storesThe5NewestAttemptedProblemsPerTopicNewestFirst() {
        var id = syncedUser().getId();
        submit(id, "1/A", List.of("dp"), 1200, "OK", 9);
        submit(id, "2/A", List.of("dp"), 1200, "WRONG_ANSWER", 8);
        submit(id, "3/A", List.of("dp"), 1200, "OK", 7);
        submit(id, "4/A", List.of("dp"), 1200, "WRONG_ANSWER", 6);
        submit(id, "4/A", List.of("dp"), 1200, "OK", 1); // solved later: moves to the front, solved
        submit(id, "5/A", List.of("dp", "math"), 1200, "WRONG_ANSWER", 4);
        submit(id, "6/A", List.of("dp", "math"), 1200, "TIME_LIMIT_EXCEEDED", 3);
        service.recomputeForUser(id);
        var stats = statsOf(id);
        assertThat(stats.get("dp").lastResults()).containsExactly(new LastResult("4/A", true),
                new LastResult("6/A", false), new LastResult("5/A", false), new LastResult("3/A", true),
                new LastResult("2/A", false));
        assertThat(stats.get("dp+math").lastResults()).containsExactly(new LastResult("6/A", false),
                new LastResult("5/A", false));
    }

    @Test
    void returnsLastResultsFromGetStatsAndTheSummary() {
        var id = syncedUser().getId();
        submit(id, "1/A", List.of("dp"), 1200, "OK", 2);
        submit(id, "2/A", List.of("dp"), 1200, "WRONG_ANSWER", 1);
        submit(id, "3/A", List.of("dp"), 1200, "WRONG_ANSWER", 0);
        service.recomputeForUser(id);
        assertThat(service.getStats(id, StatsQuery.DEFAULT).items().getFirst().lastResults()).containsExactly(
                new LastResult("3/A", false), new LastResult("2/A", false), new LastResult("1/A", true));
        assertThat(service.getSummary(id).data().weakest().getFirst().lastResults()).hasSize(3);
    }
}
