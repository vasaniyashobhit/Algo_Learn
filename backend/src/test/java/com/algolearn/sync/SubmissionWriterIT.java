package com.algolearn.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.AppException;
import com.algolearn.support.CfData;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ParameterizedPreparedStatementSetter;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy insertSubmissions.test.js. */
class SubmissionWriterIT extends SyncTestBase {

    SubmissionWriterIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, SubmissionWriter writer) {
        super(mvc, jdbc, users, lock, writer);
    }

    static List<NewSubmission> rows(long... ids) {
        return java.util.Arrays.stream(ids).mapToObj(id -> CfSubmissions.toRow(CfData.submission(id))).toList();
    }

    @Test
    void returnsZeroAndWritesNothingForAnEmptyList() {
        assertThat(writer.insertIgnoringDuplicates(linkedUser().getId(), List.of(), NOW)).isZero();
    }

    @Test
    void insertsEveryNewSubmission() {
        var id = linkedUser().getId();
        assertThat(writer.insertIgnoringDuplicates(id, rows(1, 2), NOW)).isEqualTo(2);
        assertThat(writer.countForUser(id)).isEqualTo(2);
    }

    @Test
    void skipsDuplicatesAndStillInsertsTheRest() {
        var id = linkedUser().getId();
        writer.insertIgnoringDuplicates(id, rows(2), NOW);
        assertThat(writer.insertIgnoringDuplicates(id, rows(1, 2, 3), NOW)).isEqualTo(2);
        assertThat(count()).isEqualTo(3);
    }

    @Test
    void returnsZeroWhenEverySubmissionIsAlreadyStored() {
        var id = linkedUser().getId();
        writer.insertIgnoringDuplicates(id, rows(7), NOW);
        assertThat(writer.insertIgnoringDuplicates(id, rows(7), NOW)).isZero();
    }

    @Test
    @SuppressWarnings("unchecked")
    void wrapsAnyOtherFailureInA500WithTheCause() {
        var failing = mock(JdbcTemplate.class);
        var cause = new DataAccessResourceFailureException("connection lost");
        when(failing.batchUpdate(anyString(), any(List.class), anyInt(),
                any(ParameterizedPreparedStatementSetter.class))).thenThrow(cause);
        var writer = new SubmissionWriter(failing);
        assertThatThrownBy(() -> writer.insertIgnoringDuplicates(UUID.randomUUID(), rows(1), NOW))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status().value()).isEqualTo(500);
                    assertThat(e.code().name()).isEqualTo("INTERNAL_ERROR");
                    assertThat(e.getCause()).isSameAs(cause);
                });
    }
}
