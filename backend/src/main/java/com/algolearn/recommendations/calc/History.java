package com.algolearn.recommendations.calc;

import com.algolearn.stats.calc.GroupByProblem;
import com.algolearn.stats.calc.ProblemAttempt;
import com.algolearn.stats.calc.SubmissionRow;
import java.util.Comparator;
import java.util.List;

/** Legacy summarizeHistory: solved problem ids and the {@code n} most recent never-solved problems. */
public final class History {

    private History() {
    }

    public static Summary summarize(List<SubmissionRow> submissions, int n) {
        var problems = GroupByProblem.group(submissions);
        var solvedIds = problems.stream().filter(ProblemAttempt::solved).map(ProblemAttempt::problemId).toList();
        var recentFailed = problems.stream()
                .filter(p -> !p.solved())
                .sorted(Comparator.comparing(ProblemAttempt::lastAt).reversed()
                        .thenComparing(ProblemAttempt::problemId))
                .limit(n)
                .map(p -> new FailedProblem(p.problemId(), p.tags()))
                .toList();
        return new Summary(solvedIds, recentFailed);
    }

    /** Solved ids (first-attempt order) and the recent failures (newest last submission first). */
    public record Summary(List<String> solvedIds, List<FailedProblem> recentFailed) {

        public Summary {
            solvedIds = List.copyOf(solvedIds);
            recentFailed = List.copyOf(recentFailed);
        }
    }
}
