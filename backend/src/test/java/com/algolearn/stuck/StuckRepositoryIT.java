package com.algolearn.stuck;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import com.algolearn.stuck.match.StuckProblem;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.StuckDoubles;
import com.algolearn.support.UserData;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stuck.repository.test.js on PostgreSQL. */
class StuckRepositoryIT extends StuckIT {

    private final StuckRepository repo;
    private final UserRepository users;

    StuckRepositoryIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems, StuckRepository repo,
            UserRepository users) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
        this.repo = repo;
        this.users = users;
    }

    @Test
    void findsAProblemByIdWithTheStatementAndEditorialFields() {
        seed("1/A", "Theatre Square", "Pave it.", 1000, "Ceil.", "dp", "greedy");
        assertThat(repo.findProblem("1/A")).get().satisfies(p -> {
            assertThat(p.title()).isEqualTo("Theatre Square");
            assertThat(p.editorial()).isEqualTo("Ceil.");
            assertThat(p.tags()).containsExactly("dp", "greedy");
        });
        assertThat(repo.findProblem("2/A")).isEmpty();
    }

    @Test
    void textSearchesTheNearestProblemsByRelevance() {
        seed("1/A", "Theatre Square", "Pave the theatre square with flagstones.", 1000, null, "math");
        seed("2/A", "Watermelon", "Divide the watermelon.", 800, null, "math");
        seed("3/A", "Square", "A square grid of flagstones.", 900, null, "math");
        assertThat(repo.searchProblems("theatre square flagstones", 5).stream().map(StuckProblem::id))
                .containsExactly("1/A", "3/A");
        assertThat(repo.searchProblems("theatre", 1)).hasSize(1);
        assertThat(repo.searchProblems("", 5)).isEmpty();
        assertThat(repo.searchProblems(null, 5)).isEmpty();
    }

    @Test
    void readsOnlyTheRequestedTopicStatsOfThatUser() throws Exception {
        var user = UserData.syncedUser(users, 1450).getId();
        var other = UUID.fromString(com.algolearn.support.Accounts.signup(mvc).user().get("id").asString());
        UserData.stat(jdbc, user, "dp", 4, 0.3, null);
        UserData.stat(jdbc, user, "math", 4, 0.9, null);
        UserData.stat(jdbc, other, "dp", 4, 0.8, null);
        assertThat(repo.topicStats(user, List.of("dp", "greedy")))
                .containsExactly(new TopicStatRow("dp", "single", 0.3, 4));
    }

    @Test
    void returnsTheUserRatingAndSolvedProblemIds() {
        var user = UserData.syncedUser(users, 1450).getId();
        UserData.submit(jdbc, user, "4/A", List.of("math"), 800, "OK");
        UserData.submit(jdbc, user, "4/A", List.of("math"), 800, "OK");
        UserData.submit(jdbc, user, "5/B", List.of("dp"), 1200, "WRONG_ANSWER");
        assertThat(repo.userContext(user)).isEqualTo(new StuckRepository.UserContext(1450, List.of("4/A")));
        assertThat(repo.userContext(UUID.randomUUID())).isEqualTo(new StuckRepository.UserContext(null, List.of()));
    }
}
