package com.algolearn.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.stats.dto.StatsMeta;
import com.algolearn.stats.dto.TopicStatView;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stats.get.service.test.js. */
class StatsReadIT extends StatsTestBase {

    StatsReadIT(MockMvc mvc, JdbcTemplate jdbc, StatsService service, UserRepository users, StatsQueries queries) {
        super(mvc, jdbc, service, users, queries);
    }

    private UUID seed() {
        var id = syncedUser().getId();
        stat(id, "dp", 0.7, 3, "single");
        stat(id, "math", 0.4, 9, "single");
        stat(id, "greedy", 0.7, 5, "single");
        stat(id, "dp+math", 0.6, 2, "pair");
        stat(syncedUser("other", null, null).getId(), "graphs", 0.9, 1, "single");
        return id;
    }

    static List<String> keys(StatsService.StatsPage page) {
        return page.items().stream().map(TopicStatView::topicKey).toList();
    }

    @Test
    void listsSingleTopicsByStrengthTiesMoreAttemptsFirstWithMeta() {
        var page = service.getStats(seed(), StatsQuery.DEFAULT);
        assertThat(keys(page)).containsExactly("greedy", "dp", "math");
        assertThat(page.items().getFirst().tags()).containsExactly("greedy");
        assertThat(page.items().getFirst().strength()).isEqualTo(0.7);
        assertThat(page.meta()).isEqualTo(new StatsMeta("single", "strength", 50, 3, "2026-10-29T12:00:00.000Z", null));
    }

    @Test
    void sortsByAttemptedLimitsAndFiltersPairs() {
        var id = seed();
        var byAttempts = service.getStats(id, new StatsQuery("single", "attempted", 2));
        assertThat(keys(byAttempts)).containsExactly("math", "greedy");
        assertThat(byAttempts.meta().total()).isEqualTo(3);
        var pairs = service.getStats(id, new StatsQuery("pair", "strength", 10));
        assertThat(keys(pairs)).containsExactly("dp+math");
        assertThat(pairs.items().getFirst().tags()).containsExactly("dp", "math");
    }

    @Test
    void returnsEmptyItemsWithReasonNoHandleWhenNoHandleIsLinked() {
        var id = syncedUser(null, null, null).getId();
        stat(id, "dp", 0.5, 1, "single");
        var page = service.getStats(id, StatsQuery.DEFAULT);
        assertThat(page.items()).isEmpty();
        assertThat(page.meta()).isEqualTo(new StatsMeta("single", "strength", 50, 0, null, "NO_HANDLE"));
    }

    @Test
    void addsReasonNotSyncedForALinkedHandleThatWasNeverSynced() {
        var page = service.getStats(syncedUser("Ada_L", 1200, null).getId(), StatsQuery.DEFAULT);
        assertThat(page.items()).isEmpty();
        assertThat(page.meta().total()).isZero();
        assertThat(page.meta().reason()).isEqualTo("NOT_SYNCED");
    }

    @Test
    void throwsAuthInvalidTokenForADeletedAccount() {
        assertThatThrownBy(() -> service.getStats(UUID.randomUUID(), StatsQuery.DEFAULT))
                .hasMessage("This account no longer exists");
        assertThatThrownBy(() -> service.getSummary(UUID.randomUUID())).hasMessage("This account no longer exists");
    }
}
