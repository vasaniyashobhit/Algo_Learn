package com.algolearn.stats.calc;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * One entry per problem (legacy groupByProblem). Rating and tags come from the newest submission
 * that has them (Codeforces can retag a problem), so submissions are read oldest first and a
 * later one only overrides what it actually carries.
 */
public final class GroupByProblem {

    static final String ACCEPTED = "OK";

    private GroupByProblem() {
    }

    public static List<ProblemAttempt> group(List<SubmissionRow> submissions) {
        var byId = new LinkedHashMap<String, Builder>();
        var oldestFirst = new ArrayList<>(submissions);
        oldestFirst.sort(Comparator.comparing(SubmissionRow::submittedAt));
        for (var next : oldestFirst) {
            var current = byId.get(next.problemId());
            if (current == null) {
                byId.put(next.problemId(), new Builder(next));
            } else {
                current.add(next);
            }
        }
        return byId.values().stream().map(Builder::build).toList();
    }

    /** Running values of one problem while its submissions are read oldest first. */
    private static final class Builder {

        private final String problemId;
        private Integer rating;
        private List<String> tags;
        private boolean solved;
        private int attempts = 1;
        private java.time.Instant lastAt;

        Builder(SubmissionRow first) {
            problemId = first.problemId();
            rating = first.problemRating();
            tags = first.problemTags();
            solved = ACCEPTED.equals(first.verdict());
            lastAt = first.submittedAt();
        }

        void add(SubmissionRow next) {
            attempts += 1;
            solved = solved || ACCEPTED.equals(next.verdict());
            lastAt = next.submittedAt();
            if (next.problemRating() != null) {
                rating = next.problemRating();
            }
            if (!next.problemTags().isEmpty()) {
                tags = next.problemTags();
            }
        }

        ProblemAttempt build() {
            return new ProblemAttempt(problemId, rating, tags, solved, attempts, lastAt);
        }
    }
}
