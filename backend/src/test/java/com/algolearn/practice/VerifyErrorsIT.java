package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Problems;
import com.algolearn.support.UserData;
import com.algolearn.support.Users;
import com.algolearn.sync.SubmissionWriter;
import com.algolearn.sync.SyncLock;
import com.algolearn.sync.SyncSettings;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.verify.errors.test.js: sync cooldown, lock and errors. */
class VerifyErrorsIT extends VerifyTestBase {

    VerifyErrorsIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            UserRepository users, SyncLock lock, SubmissionWriter writer, PracticeQueries practice,
            VerifyQueries queries) {
        super(mvc, jdbc, problems, search, users, lock, writer, practice, queries);
    }

    private VerifyService cooling() {
        return verifier(new SyncSettings(5 * 60_000L, 5, 3, 20_000));
    }

    private UUID recentlySynced() {
        var user = Users.user("Ada_L");
        user.setLastSyncedAt(NOW.minusSeconds(5));
        return save(user).getId();
    }

    private static void expectCode(Runnable call, String code) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.code().name()).isEqualTo(code));
    }

    @Test
    void insideTheCooldownVerifiesFromStoredSubmissionsWithoutCallingCodeforces() {
        seed(Problems.at("50/B"));
        var user = recentlySynced();
        UserData.submit(jdbc, user, "50/B", List.of("dp"), 1500, "OK");
        var result = cooling().verify(user, "50/B");
        assertThat(result.verified()).isTrue();
        assertThat(result.item().status()).isEqualTo("solved");
        assertThat(cf.statusCalls).isEmpty();
    }

    @Test
    void insideTheCooldownAndNotSolvedInTheStoredDataPassesRateLimitedOn() {
        seed(Problems.at("50/B"));
        var user = recentlySynced();
        assertThatThrownBy(() -> cooling().verify(user, "50/B")).isInstanceOfSatisfying(AppException.class, e -> {
            assertThat(e.status().value()).isEqualTo(429);
            assertThat(e.code().name()).isEqualTo("RATE_LIMITED");
            assertThat(e.details()).isEqualTo(Map.of("retryAfterSeconds", 15L));
        });
    }

    @Test
    void respectsTheSyncLock409SyncInProgress() {
        seed(Problems.at("50/B"));
        var user = Users.user("Ada_L");
        user.setSyncLockedUntil(NOW.plusSeconds(60));
        var id = save(user).getId();
        expectCode(() -> cooling().verify(id, "50/B"), "SYNC_IN_PROGRESS");
    }

    @Test
    void answers400CfHandleNotLinkedWithoutAHandle() {
        seed(Problems.at("50/B"));
        var id = save(Users.user()).getId();
        expectCode(() -> cooling().verify(id, "50/B"), "CF_HANDLE_NOT_LINKED");
    }
}
