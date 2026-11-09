package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.LAST_RESULTS;

import com.algolearn.stats.LastResult;
import com.algolearn.stats.calc.ComfortRating.Solve;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Running totals of one topic key while problems are added (legacy topicTotals). */
public final class TopicTotals {

    final String topicKey;
    final String kind;
    int attempted;
    int solved;
    double solvedScore;
    double failScore;
    final List<Solve> solves = new ArrayList<>();
    final List<Result> results = new ArrayList<>();
    Instant lastActivityAt;

    public TopicTotals(String topicKey, String kind) {
        this.topicKey = topicKey;
        this.kind = kind;
    }

    /** Adds one grouped problem and its contribution. */
    public TopicTotals add(ProblemAttempt problem, StrengthMath.Contribution contribution) {
        attempted += 1;
        solvedScore += contribution.solvedScore();
        failScore += contribution.failScore();
        results.add(new Result(problem.problemId(), problem.solved(), problem.lastAt()));
        if (problem.solved()) {
            solved += 1;
            if (problem.rating() != null) {
                solves.add(new Solve(problem.rating(), problem.lastAt()));
            }
        }
        if (lastActivityAt == null || problem.lastAt().isAfter(lastActivityAt)) {
            lastActivityAt = problem.lastAt();
        }
        return this;
    }

    /** The newest {@code limit} attempted problems, newest first (ties by id so the order is stable). */
    public static List<LastResult> lastResults(List<Result> results, int limit) {
        return results.stream()
                .sorted(Comparator.comparing(Result::at).reversed().thenComparing(Result::problemId))
                .limit(limit)
                .map(r -> new LastResult(r.problemId(), r.solved()))
                .toList();
    }

    /** Turns the totals into the fields of a topic_stats row (without the user). */
    public TopicStatDoc toDoc(Integer userRating, Instant now) {
        var ratings = solves.stream().map(Solve::rating).toList();
        var avg = ratings.isEmpty() ? null
                : (int) Math.round(ratings.stream().mapToInt(Integer::intValue).average().orElseThrow());
        var max = ratings.stream().max(Integer::compare).orElse(null);
        return new TopicStatDoc(topicKey, kind, attempted, solved, attempted - solved, avg, max,
                ComfortRating.of(solves, userRating, now), StrengthMath.strength(solvedScore, failScore),
                lastActivityAt, lastResults(results, LAST_RESULTS));
    }

    public int attempted() {
        return attempted;
    }

    public String kind() {
        return kind;
    }

    /** One attempted problem of this topic. */
    public record Result(String problemId, boolean solved, Instant at) {
    }
}
