package com.algolearn.recommendations.dto;

import com.algolearn.recommendations.calc.TargetRange;
import com.algolearn.recommendations.calc.TopicPick;
import java.util.List;

/** One topic of GET /recommendations: the pick's fields, its target range and up to 5 problems (legacy order). */
public record RecommendedTopic(String topic, String basis, Double strength, int attempted, int solved,
        Integer comfortRating, double frequency, Double priority, String reason, TargetRange targetRange,
        List<RecommendedProblem> problems) {

    public RecommendedTopic {
        problems = List.copyOf(problems);
    }

    public static RecommendedTopic of(TopicPick pick, TargetRange range, List<RecommendedProblem> problems) {
        return new RecommendedTopic(pick.topic(), pick.basis(), pick.strength(), pick.attempted(), pick.solved(),
                pick.comfortRating(), pick.frequency(), pick.priority(), pick.reason(), range, problems);
    }
}
