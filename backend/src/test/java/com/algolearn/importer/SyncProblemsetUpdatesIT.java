package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Ports legacy syncNewProblems.update.test.js: rating/tag refreshes of cf_api rows. */
class SyncProblemsetUpdatesIT extends SyncProblemsetTestBase {

    SyncProblemsetUpdatesIT(MockMvc mvc, JdbcTemplate jdbc, ProblemWriter writer, CfApiUpdater updater,
            ProblemRepository problems) {
        super(mvc, jdbc, writer, updater, problems);
    }

    private Object updatedAt(String id) {
        return jdbc.queryForObject("SELECT updated_at FROM problems WHERE id = ?", Object.class, id);
    }

    @Test
    void updatesRatingAndTagsOfCfApiRowsThatChangedOnCodeforces() {
        sync(List.of(cf(2100, "A", "CF 2100A", null, List.of())));
        var summary = sync(List.of(cf(2100, "A", "Renamed", 1900, List.of("dp", "math"))));
        assertThat(List.of(summary.inserted(), summary.alreadyPresent(), summary.updated())).containsExactly(0, 1, 1);
        var row = row("2100/A");
        assertThat(row.getRating()).isEqualTo(1900);
        assertThat(row.getTags()).containsExactly("dp", "math");
        assertThat(row.getTagCount()).isEqualTo(2);
        assertThat(List.of(row.getTitle(), row.getSource())).containsExactly("CF 2100A", "cf_api");
    }

    @Test
    void reportsZeroUpdatedAndKeepsUpdatedAtWhenNothingChanged() {
        sync(List.of(cf(2101, "A", "X", 1600, List.of("dp", "math"))));
        var before = updatedAt("2101/A");
        assertThat(sync(List.of(cf(2101, "A", "X", 1600, List.of("math", "dp")))).updated()).isZero();
        assertThat(updatedAt("2101/A")).isEqualTo(before);
    }

    @Test
    void neverTouchesHfRowsOrAnyTextField() {
        insertProblem("1/A", "hf", "Original", 1000, "dp", "greedy");
        assertThat(sync(List.of(cf(1, "A", "X", 2500, List.of("dp")))).updated()).isZero();
        var row = row("1/A");
        assertThat(row.getRating()).isEqualTo(1000);
        assertThat(row.getTags()).containsExactly("dp", "greedy");
        assertThat(List.of(row.getTitle(), row.getSource())).containsExactly("Original", "hf");
    }

    @Test
    void updatesAMinimalStubWithoutChangingItsTitleOrText() {
        insertProblem("2102/B", "cf_api", "Stub", 1200, "math");
        assertThat(sync(List.of(cf(2102, "B", "New name", 1300, List.of("greedy")))).updated()).isEqualTo(1);
        var row = row("2102/B");
        assertThat(row.getRating()).isEqualTo(1300);
        assertThat(row.getTags()).containsExactly("greedy");
        assertThat(row.getTagCount()).isEqualTo(1);
        assertThat(List.of(row.getTitle(), row.getDescription())).containsExactly("Stub", "");
    }

    @Test
    void leavesCfApiRowsThatCodeforcesNoLongerListsAlone() {
        sync(List.of(cf(2103, "A")));
        assertThat(sync(List.of()).updated()).isZero();
        assertThat(row("2103/A").getRating()).isEqualTo(1600);
    }
}
