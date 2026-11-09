package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.AppException;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.CfData;
import com.algolearn.support.Problems;
import com.algolearn.sync.SubmissionWriter;
import com.algolearn.sync.SyncLock;
import com.algolearn.sync.SyncService;
import com.algolearn.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.verify.errors.test.js — problem check before syncing, other sync failures. */
class VerifyFailuresIT extends VerifyTestBase {

    VerifyFailuresIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            UserRepository users, SyncLock lock, SubmissionWriter writer, PracticeQueries practice,
            VerifyQueries queries) {
        super(mvc, jdbc, problems, search, users, lock, writer, practice, queries);
    }

    @Test
    void answers404ProblemNotFoundBeforeSyncing() {
        var sync = mock(SyncService.class);
        var user = linkedUser();
        assertThatThrownBy(() -> verifier(sync).verify(user, "99/Z")).isInstanceOfSatisfying(AppException.class, e -> {
            assertThat(e.status().value()).isEqualTo(404);
            assertThat(e.code().name()).isEqualTo("PROBLEM_NOT_FOUND");
        });
        verifyNoInteractions(sync);
    }

    @Test
    void passesOtherSyncFailuresOnUnchanged() {
        seed(Problems.at("50/B"));
        var err = CfData.down();
        var sync = mock(SyncService.class);
        var user = linkedUser();
        when(sync.syncUser(user)).thenThrow(err);
        assertThatThrownBy(() -> verifier(sync).verify(user, "50/B")).isSameAs(err);
    }
}
