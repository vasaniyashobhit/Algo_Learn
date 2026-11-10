package com.algolearn.e2e;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfProblemset;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Fake Codeforces (legacy e2e/server/fakeCodeforces.js). Any handle starting with {@code e2e_} exists, so parallel
 * tests can each link their own; each handle gets its own submission id range and a fixed history over the seeded
 * problems, spread over the last 30 days. Never touches the network.
 */
class E2eCodeforces implements CodeforcesClient {

    static final Pattern FAKE_HANDLE = Pattern.compile("^e2e_\\w+$", Pattern.CASE_INSENSITIVE);
    static final long DAY = 86_400;
    /** Seeded-problem index → verdicts, oldest first (WA before the eventual OK). */
    static final List<Map.Entry<Integer, List<String>>> PLAN = List.of(
            Map.entry(1, List.of("OK")), Map.entry(2, List.of("WRONG_ANSWER", "OK")),
            Map.entry(3, List.of("WRONG_ANSWER", "TIME_LIMIT_EXCEEDED")), Map.entry(4, List.of("OK")),
            Map.entry(5, List.of("WRONG_ANSWER")), Map.entry(6, List.of("OK")), Map.entry(7, List.of("OK")),
            Map.entry(8, List.of("WRONG_ANSWER", "OK")), Map.entry(9, List.of("OK")),
            Map.entry(10, List.of("WRONG_ANSWER")), Map.entry(11, List.of("OK")), Map.entry(12, List.of("OK")),
            Map.entry(13, List.of("WRONG_ANSWER", "WRONG_ANSWER")), Map.entry(14, List.of("OK")),
            Map.entry(16, List.of("OK")), Map.entry(17, List.of("OK")), Map.entry(18, List.of("OK")),
            Map.entry(20, List.of("WRONG_ANSWER")), Map.entry(21, List.of("OK")));

    private final Clock clock;
    private final Map<String, List<CfSubmission>> histories = new ConcurrentHashMap<>();

    E2eCodeforces(Clock clock) {
        this.clock = clock;
    }

    static boolean isFakeHandle(String handle) {
        return FAKE_HANDLE.matcher(String.valueOf(handle)).matches();
    }

    /** A newest-first history (user.status shape) starting at submission id {@code baseId}. */
    static List<CfSubmission> history(long baseId, long nowSeconds) {
        var rows = E2eProblems.ROWS;
        var oldestFirst = new ArrayList<Map.Entry<E2eProblems.Row, String>>();
        PLAN.forEach(step -> step.getValue().forEach(v -> oldestFirst.add(Map.entry(rows.get(step.getKey()), v))));
        var list = new ArrayList<CfSubmission>();
        for (var i = 0; i < oldestFirst.size(); i++) {
            var row = oldestFirst.get(i).getKey();
            var problem = new CfProblem(row.contestId(), "A", row.title(), null, row.rating(), row.tags());
            var at = nowSeconds - (oldestFirst.size() - i) * (long) Math.floor(DAY * 1.4);
            list.add(new CfSubmission(baseId + i, row.contestId(), at, problem, oldestFirst.get(i).getValue()));
        }
        Collections.reverse(list);
        return List.copyOf(list);
    }

    @Override
    public CfProblemset problemsetProblems(List<String> tags) {
        return new CfProblemset(List.of(), List.of());
    }

    @Override
    public List<CfUser> userInfo(List<String> handles) {
        return handles.stream().map(handle -> {
            if (!isFakeHandle(handle)) {
                throw new NotFoundException(ErrorCode.CF_HANDLE_NOT_FOUND, "Codeforces handle not found");
            }
            return new CfUser(handle, 1450, 1580);
        }).toList();
    }

    @Override
    public List<CfSubmission> userStatus(String handle, int from, Integer count) {
        var all = histories.computeIfAbsent(String.valueOf(handle).toLowerCase(Locale.ROOT),
                key -> history(1_000_000L + histories.size() * 1_000L, clock.millis() / 1000));
        var start = Math.min(from - 1, all.size());
        var end = Math.min(start + (count == null ? 1_000 : count), all.size());
        return all.subList(start, end);
    }
}
