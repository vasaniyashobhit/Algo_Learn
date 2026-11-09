package com.algolearn.practice;

import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.CfData;
import com.algolearn.support.ProblemDatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.sync.SubmissionWriter;
import com.algolearn.sync.SyncLock;
import com.algolearn.sync.SyncService;
import com.algolearn.sync.SyncSettings;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy tests/helpers/sync.js for the verify tests: TEST_SYNC (no cooldown), a linked user "Ada_L". */
abstract class VerifyTestBase extends ProblemDatabaseTest {

    static final SyncSettings TEST_SYNC = new SyncSettings(5 * 60_000L, 5, 3, 0);
    static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    protected final UserRepository users;
    private final SyncLock lock;
    private final SubmissionWriter writer;
    private final PracticeQueries practice;
    private final VerifyQueries queries;

    VerifyTestBase(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            UserRepository users, SyncLock lock, SubmissionWriter writer, PracticeQueries practice,
            VerifyQueries queries) {
        super(mvc, jdbc, problems, search);
        this.users = users;
        this.lock = lock;
        this.writer = writer;
        this.practice = practice;
        this.queries = queries;
    }

    @BeforeEach
    void fixTime() {
        clock.set(NOW);
        cf.withUser(CfData.user("Ada_L"));
    }

    VerifyService verifier(SyncService sync) {
        return new VerifyService(sync, practice, queries, clock);
    }

    VerifyService verifier(SyncSettings settings) {
        return verifier(new SyncService(cf, lock, writer, jdbc, id -> { }, clock, settings));
    }

    VerifyService verifier(List<CfSubmission> submissions) {
        cf.withSubmissions(submissions);
        return verifier(TEST_SYNC);
    }

    UUID linkedUser() {
        return users.save(Users.user("Ada_L")).getId();
    }

    User save(User user) {
        return users.save(user);
    }

    /** A submission on {@code contestId/index} (rating 1500, tag dp); a null verdict is still being judged. */
    static CfSubmission on(long id, int contestId, String index, String verdict) {
        return CfData.submission(id, verdict, new CfProblem(contestId, index, "P", null, 1500, List.of("dp")));
    }

    long solvedItems(UUID userId) {
        var count = jdbc.queryForObject("SELECT count(*) FROM practice_items WHERE user_id = ? AND status = 'solved'",
                Long.class, userId);
        return count == null ? 0 : count;
    }
}
