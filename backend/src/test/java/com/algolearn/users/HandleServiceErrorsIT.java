package com.algolearn.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.error.AppException;
import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.FakeCodeforcesClient;
import com.algolearn.support.Users;
import com.algolearn.sync.SyncLock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/** Legacy handle.service.test.js: Codeforces without a user, unique-index race, other database errors. */
class HandleServiceErrorsIT extends DatabaseTest {

    private final UserRepository users;
    private final SyncLock lock;
    private final TransactionTemplate tx;

    HandleServiceErrorsIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, TransactionTemplate tx) {
        super(mvc, jdbc);
        this.users = users;
        this.lock = lock;
        this.tx = tx;
    }

    @Test
    void answersCfHandleNotFoundWhenCodeforcesReturnsNoUser() {
        var user = users.save(Users.user());
        var empty = new HandleService(new FakeCodeforcesClient() {
            @Override
            public List<CfUser> userInfo(List<String> handles) {
                return List.of();
            }
        }, users, new HandleQueries(jdbc), lock, tx, clock);
        assertThatThrownBy(() -> empty.linkHandle(user.getId(), "ghost")).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.code().name() + " " + e.status().value()).isEqualTo("CF_HANDLE_NOT_FOUND 404"));
    }

    @Test
    void mapsARaceOnTheUniqueIndexToCfHandleTakenAndRethrowsOtherErrors() {
        var user = users.save(Users.user());
        cf.withUser(CfData.user("tourist"));
        var queries = mock(HandleQueries.class);
        var race = new DuplicateKeyException("uk_users_cf_handle");
        when(queries.link(any(), any(), anyBoolean(), any())).thenThrow(race);
        var racing = new HandleService(cf, users, queries, lock, tx, clock);
        assertThatThrownBy(() -> racing.linkHandle(user.getId(), "tourist")).isInstanceOfSatisfying(
                AppException.class, e -> assertThat(e.code().name() + " " + e.status().value())
                        .isEqualTo("CF_HANDLE_TAKEN 409"));
        var boom = new QueryTimeoutException("db down");
        var failing = mock(HandleQueries.class);
        when(failing.link(any(), any(), anyBoolean(), any())).thenThrow(boom);
        assertThatThrownBy(() -> new HandleService(cf, users, failing, lock, tx, clock).linkHandle(user.getId(),
                "tourist")).isSameAs(boom);
    }
}
