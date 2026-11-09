package com.algolearn.sync;

import static com.algolearn.support.CfData.problem;
import static com.algolearn.support.CfData.submission;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.support.CfData;
import com.algolearn.users.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy sync.service.success.test.js. */
class SyncServiceSuccessIT extends SyncTestBase {

    SyncServiceSuccessIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, SubmissionWriter writer) {
        super(mvc, jdbc, users, lock, writer);
    }

    @Test
    void pagesThroughTheHistoryUpToMaxPagesAndStoresStorableSubmissions() {
        cf.withUser(CfData.user("Ada_L", 1720, 1900)).withSubmissions(CfData.history(20));
        var user = linkedUser();
        var result = service().syncUser(user.getId());
        assertThat(cf.statusCalls).containsExactly("Ada_L 1 5", "Ada_L 6 5", "Ada_L 11 5");
        assertThat(result).isEqualTo(new SyncResult(15, 15, "2026-10-29T10:00:00.000Z", List.of()));
        var stored = jdbc.queryForMap("SELECT user_id, problem_rating, verdict, array_to_string(problem_tags, ',') "
                + "AS tags FROM submissions WHERE cf_submission_id = 20");
        assertThat(stored).containsEntry("problem_rating", 1500).containsEntry("verdict", "OK")
                .containsEntry("tags", "dp,math").containsEntry("user_id", user.getId());
    }

    @Test
    void refreshesTheRatingSetsLastSyncedAtAndCursorAndReleasesTheLock() {
        cf.withUser(CfData.user("Ada_L", 1720, 1900)).withSubmissions(CfData.history(3));
        var user = linkedUser();
        service().syncUser(user.getId());
        var stored = reload(user.getId());
        assertThat(stored.getCfRating()).isEqualTo(1720);
        assertThat(stored.getCfMaxRating()).isEqualTo(1900);
        assertThat(stored.getLastSyncedAt()).isEqualTo(NOW);
        assertThat(stored.getLastSubmissionId()).isEqualTo(3);
        assertThat(stored.getSyncLockedUntil()).isNull();
    }

    @Test
    void skipsSubmissionsWithoutAContestIdAndPendingOnes() {
        cf.withSubmissions(List.of(submission(4, "TESTING"), submission(3, "OK", problem(null, "A")),
                submission(2), submission(1)));
        var user = linkedUser();
        var result = service().syncUser(user.getId());
        assertThat(result.newSubmissions()).isEqualTo(2);
        assertThat(result.pending()).containsExactly(new PendingRef("1004/A", 4));
        assertThat(reload(user.getId()).getLastSubmissionId()).isEqualTo(3);
    }

    @Test
    void callsTheOnSyncedHookWithTheUserIdAfterSaving() {
        cf.withSubmissions(CfData.history(2));
        var calls = new ArrayList<UUID>();
        var counts = new ArrayList<Long>();
        var user = linkedUser();
        service(TEST_SYNC, id -> {
            calls.add(id);
            counts.add(count());
        }).syncUser(user.getId());
        assertThat(calls).containsExactly(user.getId());
        assertThat(counts).containsExactly(2L);
    }

    @Test
    void worksWithANoOpHookAndAHandleWithNoRating() {
        cf.withUser(new CfUser("Ada_L", null, null));
        var user = linkedUser();
        assertThat(service().syncUser(user.getId()).newSubmissions()).isZero();
        var stored = reload(user.getId());
        assertThat(stored.getCfRating()).isNull();
        assertThat(stored.getLastSubmissionId()).isNull();
    }
}
