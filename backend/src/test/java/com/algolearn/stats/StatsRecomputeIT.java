package com.algolearn.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import com.algolearn.stats.StatsService.RecomputeResult;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stats.recompute.test.js. */
class StatsRecomputeIT extends StatsTestBase {

    StatsRecomputeIT(MockMvc mvc, JdbcTemplate jdbc, StatsService service, UserRepository users, StatsQueries queries) {
        super(mvc, jdbc, service, users, queries);
    }

    @Test
    void writesSingleAndPairStatsComputedFromTheSubmissions() {
        var id = syncedUser().getId();
        submit(id, "1/A", List.of("dp", "greedy"), 1200, "WRONG_ANSWER");
        submit(id, "1/A", List.of("dp", "greedy"), 1200, "OK");
        submit(id, "2/B", List.of("dp", "greedy", "*special"), 1500, "WRONG_ANSWER");
        submit(id, "3/C", List.of("math"), 1300, "OK");
        assertThat(service.recomputeForUser(id)).isEqualTo(new RecomputeResult(3, 1, 0));
        var stats = statsOf(id);
        assertThat(stats.keySet()).containsExactly("dp", "dp+greedy", "greedy", "math");
        var dp = stats.get("dp");
        assertThat(List.of(dp.attempted(), dp.solved(), dp.failed())).containsExactly(2, 1, 1);
        assertThat(List.of(dp.maxSolvedRating(), dp.avgSolvedRating(), dp.comfortRating()))
                .containsExactly(1200, 1200, 1200);
        assertThat(dp.kind()).isEqualTo("single");
        assertThat(dp.lastActivityAt()).isEqualTo(STATS_NOW);
        assertThat(dp.strength()).isCloseTo(0.5242254, within(1e-6)); // (1 + 1.5) / (1 + 0.7689414 + 3)
        assertThat(stats.get("dp+greedy").kind()).isEqualTo("pair");
        assertThat(stats.get("dp+greedy").attempted()).isEqualTo(2);
        // 1300 vs 1200: s = 0.5 + sigmoid(1/3) = 1.0825702 → (s + 1.5) / (s + 3)
        assertThat(stats.get("math").strength()).isCloseTo(0.6325844, within(1e-6));
    }

    @Test
    void replacesPreviousValuesAndDeletesStaleKeysOfThisUserOnly() {
        var id = syncedUser().getId();
        var other = syncedUser("other", null, null).getId();
        stat(id, "graphs", 0.5, 9, "single");
        stat(id, "dp", 1, 99, "single");
        stat(other, "graphs", 0.5, 1, "single");
        submit(id, "1/A", List.of("dp"), 1200, "OK");
        assertThat(service.recomputeForUser(id)).isEqualTo(new RecomputeResult(1, 0, 1));
        var stats = statsOf(id);
        assertThat(stats.keySet()).containsExactly("dp");
        assertThat(stats.get("dp").attempted()).isEqualTo(1);
        assertThat(stats.get("dp").strength()).isEqualTo(0.625);
        assertThat(statsOf(other)).hasSize(1);
    }

    @Test
    void isIdempotentAndClearsEverythingWhenNoSubmissionsAreLeft() {
        var id = syncedUser().getId();
        submit(id, "1/A", List.of("dp", "math"), 1400, "OK");
        submit(id, "2/A", List.of("dp", "math"), 1400, "OK");
        service.recomputeForUser(id);
        service.recomputeForUser(id);
        assertThat(statsOf(id)).hasSize(3);
        jdbc.update("DELETE FROM submissions WHERE user_id = ?", id);
        assertThat(service.recomputeForUser(id)).isEqualTo(new RecomputeResult(0, 0, 3));
    }

    @Test
    void usesTheNeutralWeightWhenTheUserHasNoRating() {
        var id = syncedUser("Ada_L", null, STATS_NOW).getId();
        submit(id, "1/A", List.of("dp"), 3000, "OK");
        service.recomputeForUser(id);
        var dp = statsOf(id).get("dp");
        assertThat(dp.strength()).isEqualTo(0.625);
        assertThat(dp.comfortRating()).isEqualTo(3000);
    }

    @Test
    void throwsAuthInvalidTokenForADeletedAccount() {
        assertThatThrownBy(() -> service.recomputeForUser(UUID.randomUUID()))
                .hasMessage("This account no longer exists");
    }
}
