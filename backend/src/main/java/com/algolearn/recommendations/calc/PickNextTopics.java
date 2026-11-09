package com.algolearn.recommendations.calc;

import static com.algolearn.recommendations.RecommendationConstants.BASIS_FREQUENT;
import static com.algolearn.recommendations.RecommendationConstants.BASIS_LEARNING_ZONE;
import static com.algolearn.recommendations.RecommendationConstants.MAX_STRENGTH;
import static com.algolearn.recommendations.RecommendationConstants.MIN_ATTEMPTED;
import static com.algolearn.recommendations.RecommendationConstants.MIN_STRENGTH;
import static com.algolearn.recommendations.RecommendationConstants.round4;

import com.algolearn.config.Tags;
import com.algolearn.recommendations.calc.TopicFrequency.Frequency;
import com.algolearn.stats.calc.TopicStatDoc;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Legacy pickNextTopics: up to {@code n} next topics. Learning-zone topics first by priority (ties:
 * weaker, then name); the most frequent topic tags at the user's rating fill the rest (mastered ones
 * skipped), so the answer is never empty. {@code ratingKnown} only changes the reason wording.
 */
public final class PickNextTopics {

    private PickNextTopics() {
    }

    /** Attempted enough, neither weak beyond help nor mastered: strength in [0.2, 0.75]. */
    public static boolean inLearningZone(int attempted, double strength) {
        return attempted >= MIN_ATTEMPTED && strength >= MIN_STRENGTH && strength <= MAX_STRENGTH;
    }

    /** (1 − strength) · ln(1 + share). */
    public static double priority(double strength, double share) {
        return (1 - strength) * Math.log1p(share);
    }

    private static boolean isMastered(TopicStatDoc stat) {
        return stat != null && stat.attempted() >= MIN_ATTEMPTED && stat.strength() > MAX_STRENGTH;
    }

    public static List<TopicPick> pick(List<TopicStatDoc> stats, Frequency freq, int n, boolean ratingKnown) {
        var singles = (stats == null ? List.<TopicStatDoc>of() : stats).stream()
                .filter(s -> "single".equals(s.kind()) && Tags.isTopicTag(s.topicKey())).toList();
        Map<String, TopicStatDoc> statOf = singles.stream()
                .collect(Collectors.toMap(TopicStatDoc::topicKey, Function.identity(), (a, b) -> a));
        Comparator<TopicStatDoc> byPriority = Comparator
                .comparingDouble((TopicStatDoc s) -> -priority(s.strength(), freq.share(s.topicKey())))
                .thenComparingDouble(TopicStatDoc::strength)
                .thenComparing(TopicStatDoc::topicKey);
        var zone = singles.stream()
                .filter(s -> inLearningZone(s.attempted(), s.strength()))
                .sorted(byPriority).limit(n)
                .map(s -> toPick(s.topicKey(), s, BASIS_LEARNING_ZONE, freq, ratingKnown)).toList();
        var taken = new HashSet<>(zone.stream().map(TopicPick::topic).toList());
        var fill = Tags.TOPIC_TAGS.stream()
                .filter(t -> !taken.contains(t) && !isMastered(statOf.get(t)))
                .sorted(Comparator.comparingDouble((String t) -> -freq.share(t)).thenComparing(t -> t))
                .limit(Math.max(0, n - zone.size()))
                .map(t -> toPick(t, statOf.get(t), BASIS_FREQUENT, freq, ratingKnown)).toList();
        return Stream.concat(zone.stream(), fill.stream()).toList();
    }

    private static TopicPick toPick(String topic, TopicStatDoc stat, String basis, Frequency freq,
            boolean ratingKnown) {
        var share = freq.share(topic);
        var priority = BASIS_LEARNING_ZONE.equals(basis) ? round4(priority(stat.strength(), share)) : null;
        return new TopicPick(topic, basis, stat == null ? null : stat.strength(), stat == null ? 0 : stat.attempted(),
                stat == null ? 0 : stat.solved(), stat == null ? null : stat.comfortRating(), round4(share), priority,
                TopicReason.of(topic, stat, share, freq.rating(), ratingKnown));
    }
}
