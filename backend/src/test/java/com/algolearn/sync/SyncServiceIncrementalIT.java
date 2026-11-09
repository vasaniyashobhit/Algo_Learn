package com.algolearn.sync;

import static com.algolearn.support.CfData.submission;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.CfData;
import com.algolearn.users.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy sync.service.incremental.test.js. */
class SyncServiceIncrementalIT extends SyncTestBase {

    SyncServiceIncrementalIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock,
            SubmissionWriter writer) {
        super(mvc, jdbc, users, lock, writer);
    }

    @Test
    void stopsAtThePageContainingLastSubmissionIdAndStoresOnlyNewerOnes() {
        cf.withSubmissions(CfData.history(40));
        var user = linkedUser();
        user.setLastSubmissionId(33L);
        save(user);
        var result = service().syncUser(user.getId());
        assertThat(cf.statusCalls).hasSize(2);
        assertThat(result.newSubmissions()).isEqualTo(7);
        assertThat(result.totalSubmissions()).isEqualTo(7);
        assertThat(reload(user.getId()).getLastSubmissionId()).isEqualTo(40);
    }

    @Test
    void fetchesOnePageAndInsertsNothingWhenThereIsNothingNew() {
        cf.withSubmissions(CfData.history(10));
        var user = linkedUser();
        user.setLastSubmissionId(10L);
        save(user);
        var result = service().syncUser(user.getId());
        assertThat(cf.statusCalls).hasSize(1);
        assertThat(result.newSubmissions()).isZero();
        assertThat(result.totalSubmissions()).isZero();
    }

    @Test
    void ignoresSubmissionsThatAreAlreadyStored() {
        var user = linkedUser();
        writer.insertIgnoringDuplicates(user.getId(), CfData.history(3).stream().map(CfSubmissions::toRow).toList(),
                NOW);
        cf.withSubmissions(CfData.history(5));
        var result = service().syncUser(user.getId());
        assertThat(result.newSubmissions()).isEqualTo(2);
        assertThat(result.totalSubmissions()).isEqualTo(5);
    }

    @Test
    void picksUpASubmissionOnceItsVerdictArrives() {
        var user = linkedUser();
        cf.withSubmissions(List.of(submission(3), submission(2, "TESTING"), submission(1)));
        service().syncUser(user.getId());
        assertThat(reload(user.getId()).getLastSubmissionId()).isEqualTo(1);
        cf.withSubmissions(List.of(submission(3), submission(2, "WRONG_ANSWER"), submission(1)));
        var result = service().syncUser(user.getId());
        assertThat(result.newSubmissions()).isEqualTo(1);
        assertThat(result.totalSubmissions()).isEqualTo(3);
        assertThat(reload(user.getId()).getLastSubmissionId()).isEqualTo(3);
    }
}
