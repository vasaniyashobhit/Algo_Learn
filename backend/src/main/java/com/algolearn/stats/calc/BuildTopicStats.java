package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.MIN_PAIR_ATTEMPTS;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;

/** Topic stat rows from grouped problems (legacy buildTopicStats). */
public final class BuildTopicStats {

    private BuildTopicStats() {
    }

    /**
     * Every single topic with an attempt is kept; a pair only when attempted on ≥ 2 problems
     * (fewer says nothing useful).
     */
    public static List<TopicStatDoc> build(List<ProblemAttempt> problems, Integer userRating, Instant now) {
        var totalsByKey = new LinkedHashMap<String, TopicTotals>();
        for (var problem : problems) {
            var keys = TopicKeys.forTags(problem.tags());
            if (keys.isEmpty()) {
                continue;
            }
            var contribution = StrengthMath.contribution(problem, userRating, now);
            for (var key : keys) {
                totalsByKey.computeIfAbsent(key.topicKey(), k -> new TopicTotals(k, key.kind()))
                        .add(problem, contribution);
            }
        }
        return totalsByKey.values().stream()
                .filter(t -> "single".equals(t.kind()) || t.attempted() >= MIN_PAIR_ATTEMPTS)
                .map(t -> t.toDoc(userRating, now))
                .toList();
    }
}
