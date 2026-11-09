package com.algolearn.support;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfProblemset;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Fake Codeforces client (legacy tests/helpers/codeforces.js fakeCfClient). {@code users} is keyed by
 * lower-cased handle; {@code submissions} is the newest-first history user.status pages through.
 */
public class FakeCodeforcesClient implements CodeforcesClient {

    public final Map<String, CfUser> users = new HashMap<>();
    public final List<CfSubmission> submissions = new ArrayList<>();
    public final List<String> calls = new ArrayList<>();
    private Supplier<CfProblemset> problemset = () -> new CfProblemset(List.of(), List.of());

    public FakeCodeforcesClient withProblems(List<CfProblem> problems) {
        problemset = () -> new CfProblemset(problems, List.of());
        return this;
    }

    /** Makes problemset.problems answer with {@code answer} (which may throw). */
    public FakeCodeforcesClient withProblemset(Supplier<CfProblemset> answer) {
        problemset = answer;
        return this;
    }

    @Override
    public CfProblemset problemsetProblems(List<String> tags) {
        calls.add("problemset.problems");
        return problemset.get();
    }

    @Override
    public List<CfUser> userInfo(List<String> handles) {
        calls.add("user.info");
        var info = users.get(handles.getFirst().toLowerCase(Locale.ROOT));
        if (info == null) {
            throw new NotFoundException(ErrorCode.CF_HANDLE_NOT_FOUND, "Codeforces handle not found");
        }
        return List.of(info);
    }

    @Override
    public List<CfSubmission> userStatus(String handle, int from, Integer count) {
        calls.add("user.status");
        var start = Math.min(from - 1, submissions.size());
        var end = count == null ? submissions.size() : Math.min(submissions.size(), start + count);
        return List.copyOf(submissions.subList(start, end));
    }
}
