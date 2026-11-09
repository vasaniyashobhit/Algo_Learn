package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.codeforces.dto.CfProblemset;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.support.FakeCodeforcesClient;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Ports legacy syncNewProblems.test.js (inserts) against PostgreSQL. */
class SyncProblemsetTaskIT extends SyncProblemsetTestBase {

    SyncProblemsetTaskIT(MockMvc mvc, JdbcTemplate jdbc, ProblemWriter writer, CfApiUpdater updater,
            ProblemRepository problems) {
        super(mvc, jdbc, writer, updater, problems);
    }

    @Test
    void insertsOnlyProblemsNotStoredYetAsCfApiWithoutText() {
        insertProblem("1/A", "hf", "Original", 1000, "dp", "greedy");
        var summary = sync(List.of(cf(1, "A", "Changed", 2000, List.of("greedy")), cf(2100, "B")));
        assertThat(summary).isEqualTo(new SyncProblemsetTask.SyncSummary(2, 0, Map.of(), List.of(), 1, 1, 0));
        var added = row("2100/B");
        assertThat(List.of(added.getSource(), added.getDescription(), added.getTitle()))
                .containsExactly("cf_api", "", "CF 2100B");
        assertThat(added.getRating()).isEqualTo(1600);
        assertThat(added.getTagCount()).isEqualTo(1);
        assertThat(new SyncProblemsetTask(new FakeCodeforcesClient(), writer, updater).name())
                .isEqualTo("sync-problemset");
    }

    @Test
    void neverOverwritesTheTextRatingOrSourceOfHfRows() {
        insertProblem("1/A", "hf", "Original", 1000, "dp", "greedy");
        sync(List.of(cf(1, "A", "Changed", 2000, List.of())));
        var row = row("1/A");
        assertThat(List.of(row.getTitle(), row.getSource())).containsExactly("Original", "hf");
        assertThat(row.getRating()).isEqualTo(1000);
        assertThat(row.getTags()).containsExactly("dp", "greedy");
    }

    @Test
    void isIdempotentAcrossRuns() {
        var list = List.of(cf(3, "A"), cf(3, "B"));
        assertThat(sync(list).inserted()).isEqualTo(2);
        var second = sync(list);
        assertThat(List.of(second.inserted(), second.alreadyPresent())).containsExactly(0, 2);
    }

    @Test
    void rejectsMalformedProblemsAndCollapsesDuplicatesInTheApiAnswer() {
        var summary = sync(List.of(cf(null, "A"), cf(4, "A"), cf(4, "A"), cf(5, "lower")));
        assertThat(List.of(summary.fetched(), summary.rejected(), summary.inserted())).containsExactly(4, 2, 1);
        assertThat(summary.rejectedIds()).containsExactly("null/A", "5/lower");
        assertThat(summary.rejectedByReason()).isEqualTo(Map.of("invalidId", 2));
    }

    @Test
    void copesWithAnEmptyOrMissingProblemsList() {
        assertThat(sync(new FakeCodeforcesClient().withProblemset(() -> new CfProblemset(null, null))).fetched())
                .isZero();
        assertThat(sync(new FakeCodeforcesClient().withProblemset(() -> null)).fetched()).isZero();
    }

    @Test
    void propagatesClientErrors() {
        var down = new IllegalStateException("CF down");
        assertThatThrownBy(() -> sync(new FakeCodeforcesClient().withProblemset(() -> {
            throw down;
        }))).isSameAs(down);
    }
}
