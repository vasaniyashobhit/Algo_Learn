package com.algolearn.importer;

import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.problems.Problem;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.FakeCodeforcesClient;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Shared setup for the problemset sync tests: CF problem factories and a sync run on a fake client. */
abstract class SyncProblemsetTestBase extends DatabaseTest {

    protected final ProblemWriter writer;
    protected final CfApiUpdater updater;
    protected final ProblemRepository problems;

    SyncProblemsetTestBase(MockMvc mvc, JdbcTemplate jdbc, ProblemWriter writer, CfApiUpdater updater,
            ProblemRepository problems) {
        super(mvc, jdbc);
        this.writer = writer;
        this.updater = updater;
        this.problems = problems;
    }

    static CfProblem cf(Integer contestId, String index, String name, Integer rating, List<String> tags) {
        return new CfProblem(contestId, index, name, "PROGRAMMING", rating, tags);
    }

    static CfProblem cf(Integer contestId, String index) {
        return cf(contestId, index, "CF " + contestId + index, 1600, List.of("greedy"));
    }

    SyncProblemsetTask.SyncSummary sync(List<CfProblem> list) {
        return sync(new FakeCodeforcesClient().withProblems(list));
    }

    SyncProblemsetTask.SyncSummary sync(FakeCodeforcesClient client) {
        return new SyncProblemsetTask(client, writer, updater).run(ProblemWriter.BATCH_SIZE);
    }

    Problem row(String id) {
        return problems.findById(id).orElseThrow();
    }
}
