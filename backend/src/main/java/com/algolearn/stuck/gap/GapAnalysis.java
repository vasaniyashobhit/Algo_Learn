package com.algolearn.stuck.gap;

import com.algolearn.stats.calc.TopicKeys;
import com.algolearn.stuck.StuckConstants;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Legacy analyzeGap (pure): every topic key of the problem (singles and pairs) with the user's strength and status;
 * {@code items} = the gap (weak + unseen), weakest first; {@code message} is the human-readable summary.
 */
public final class GapAnalysis {

    private static final Map<String, Integer> STATUS_ORDER = Map.of("weak", 0, "unseen", 1, "developing", 2,
            "strong", 3);
    private static final Comparator<GapTopic> BY_WEAKNESS = Comparator
            .<GapTopic>comparingInt(t -> STATUS_ORDER.get(t.status()))
            .thenComparingDouble(t -> t.strength() == null ? 0 : t.strength())
            .thenComparingInt(t -> "single".equals(t.kind()) ? 0 : 1)
            .thenComparing(GapTopic::topicKey);

    private GapAnalysis() {
    }

    /** weak (< 0.4) | developing (0.4–0.7) | strong (> 0.7) | unseen (no stats yet). */
    public static String status(Double strength) {
        if (strength == null) {
            return "unseen";
        }
        if (strength < StuckConstants.WEAK_BELOW) {
            return "weak";
        }
        return strength > StuckConstants.STRONG_ABOVE ? "strong" : "developing";
    }

    public static String label(String topicKey) {
        return String.join(" + ", topicKey.split("\\+"));
    }

    public static Gap analyze(List<String> tags, List<TopicStatRow> stats) {
        var keys = TopicKeys.forTags(tags);
        var byKey = stats.stream().collect(Collectors.toMap(TopicStatRow::topicKey, Function.identity(), (a, b) -> a));
        var topics = keys.stream().map(key -> {
            var stat = byKey.get(key.topicKey());
            var strength = stat == null ? null : Math.round(stat.strength() * 100) / 100.0;
            var status = status(strength);
            return new GapTopic(key.topicKey(), key.kind(), strength, status, stat == null ? 0 : stat.attempted(),
                    message(status, label(key.topicKey()), strength));
        }).sorted(BY_WEAKNESS).toList();
        var items = topics.stream().filter(t -> "weak".equals(t.status()) || "unseen".equals(t.status())).toList();
        var singles = keys.stream().filter(k -> "single".equals(k.kind())).map(TopicKeys.TopicKey::topicKey).toList();
        return new Gap(summary(singles, items), items, topics);
    }

    static String message(String status, String label, Double strength) {
        var value = strength == null ? "" : String.format(Locale.ROOT, "%.2f", strength);
        return switch (status) {
            case "weak" -> "Your %s strength is low (%s).".formatted(label, value);
            case "unseen" -> "You have not practised %s yet.".formatted(label);
            case "developing" -> "Your %s is developing (%s).".formatted(label, value);
            default -> "You are strong at %s (%s).".formatted(label, value);
        };
    }

    private static String summary(List<String> tags, List<GapTopic> items) {
        if (tags.isEmpty()) {
            return "We could not detect the topics of this problem.";
        }
        var needs = "This problem needs " + tags.stream().map(GapAnalysis::label).collect(Collectors.joining(" + "))
                + ".";
        return items.isEmpty() ? needs + " You look ready for every topic in it." : needs + " "
                + items.getFirst().message();
    }

    /** A user's stats row for one topic key. */
    public record TopicStatRow(String topicKey, String kind, double strength, int attempted) {
    }
}
