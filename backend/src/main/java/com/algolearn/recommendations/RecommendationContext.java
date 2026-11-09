package com.algolearn.recommendations;

import com.algolearn.recommendations.calc.FailedProblem;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import com.algolearn.recommendations.calc.TopicFrequency.Frequency;
import com.algolearn.stats.calc.TopicStatDoc;
import java.time.Instant;
import java.util.List;
import java.util.function.Predicate;

/**
 * Everything getRecommendations needs about one user (legacy createContextLoader result): rating,
 * single-topic stats, tag frequency at the rating, recent failures, and what to exclude (solved and
 * practice ids, solved titles, and a matcher that also catches Div1/Div2 copies of solved problems).
 */
public record RecommendationContext(String cfHandle, Instant lastSyncedAt, Integer userRating,
        List<TopicStatDoc> stats, Frequency freq, List<FailedProblem> recentFailed, List<String> excludeIds,
        List<String> solvedTitles, Predicate<ProblemRef> isSolved) {

    public RecommendationContext {
        stats = List.copyOf(stats);
        recentFailed = List.copyOf(recentFailed);
        excludeIds = List.copyOf(excludeIds);
        solvedTitles = List.copyOf(solvedTitles);
    }
}
