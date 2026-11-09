package com.algolearn.support;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfProblemset;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Supplier;

/**
 * Fake Codeforces client (legacy tests/helpers/codeforces.js fakeCfClient). {@code users} is keyed by
 * lower-cased handle; {@code submissions} is the newest-first history user.status pages through.
 * {@code failStatus}/{@code failInfo} make the next call(s) throw. One bean in the IT context (reset per test).
 */
public class FakeCodeforcesClient implements CodeforcesClient {

    public final Map<String, CfUser> users = new ConcurrentHashMap<>();
    public final List<CfSubmission> submissions = new CopyOnWriteArrayList<>();
    public final List<String> calls = new CopyOnWriteArrayList<>();
    /** user.status calls as {@code "handle from count"}; user.info calls as the handle asked for. */
    public final List<String> statusCalls = new CopyOnWriteArrayList<>();
    public final List<String> infoCalls = new CopyOnWriteArrayList<>();
    public volatile Supplier<RuntimeException> failStatus;
    public volatile Supplier<RuntimeException> failInfo;
    private volatile Supplier<CfProblemset> problemset = () -> new CfProblemset(List.of(), List.of());

    public FakeCodeforcesClient withProblems(List<CfProblem> problems) {
        problemset = () -> new CfProblemset(problems, List.of());
        return this;
    }

    /** Makes problemset.problems answer with {@code answer} (which may throw). */
    public FakeCodeforcesClient withProblemset(Supplier<CfProblemset> answer) {
        problemset = answer;
        return this;
    }

    public FakeCodeforcesClient withUser(CfUser user) {
        users.put(user.handle().toLowerCase(Locale.ROOT), user);
        return this;
    }

    public FakeCodeforcesClient withSubmissions(List<CfSubmission> history) {
        submissions.clear();
        submissions.addAll(history);
        return this;
    }

    public void reset() {
        users.clear();
        submissions.clear();
        calls.clear();
        statusCalls.clear();
        infoCalls.clear();
        failStatus = null;
        failInfo = null;
        problemset = () -> new CfProblemset(List.of(), List.of());
    }

    @Override
    public CfProblemset problemsetProblems(List<String> tags) {
        calls.add("problemset.problems");
        return problemset.get();
    }

    @Override
    public List<CfUser> userInfo(List<String> handles) {
        calls.add("user.info");
        infoCalls.add(handles.getFirst());
        if (failInfo != null) {
            throw failInfo.get();
        }
        var info = users.get(handles.getFirst().toLowerCase(Locale.ROOT));
        if (info == null) {
            throw new NotFoundException(ErrorCode.CF_HANDLE_NOT_FOUND, "Codeforces handle not found");
        }
        return List.of(info);
    }

    @Override
    public List<CfSubmission> userStatus(String handle, int from, Integer count) {
        calls.add("user.status");
        statusCalls.add(handle + " " + from + " " + count);
        if (failStatus != null) {
            throw failStatus.get();
        }
        var all = new ArrayList<>(submissions);
        var start = Math.min(from - 1, all.size());
        var end = count == null ? all.size() : Math.min(all.size(), start + count);
        return List.copyOf(all.subList(start, end));
    }
}
