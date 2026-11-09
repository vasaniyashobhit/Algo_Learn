package com.algolearn.recommendations.calc;

import com.algolearn.config.Tags;
import com.algolearn.recommendations.RecommendationConstants;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Legacy topicFrequency.js: per-rating tag counts and the share of each topic tag near a rating. */
public final class TopicFrequency {

    private TopicFrequency() {
    }

    /**
     * One row per rating present in {@code totals} (sorted by rating), keeping only topic tags
     * ({@code *special} and unknown tags dropped, counts for ratings without a total ignored).
     */
    public static List<TagCountRow> toTagCounts(Map<Integer, Long> totals, List<TagCount> tags) {
        var byRating = new LinkedHashMap<Integer, Map<String, Long>>();
        totals.keySet().forEach(rating -> byRating.put(rating, new LinkedHashMap<>()));
        for (var count : tags) {
            var row = byRating.get(count.rating());
            if (row != null && Tags.isTopicTag(count.tag())) {
                row.put(count.tag(), count.count());
            }
        }
        return byRating.entrySet().stream()
                .map(e -> new TagCountRow(e.getKey(), totals.get(e.getKey()), e.getValue()))
                .sorted(Comparator.comparingInt(TagCountRow::rating))
                .toList();
    }

    /**
     * Share (0–1) of the problems rated within ±window of {@code userRating} (1200 when unknown)
     * carrying each of the 36 topic tags; {@code total} is the number of problems in that window.
     */
    public static Frequency atRating(List<TagCountRow> counts, Integer userRating, int window) {
        var rating = userRating == null ? RecommendationConstants.DEFAULT_RATING : userRating;
        var rows = counts.stream().filter(row -> Math.abs(row.rating() - rating) <= window).toList();
        var total = rows.stream().mapToLong(TagCountRow::total).sum();
        var frequency = new LinkedHashMap<String, Double>();
        for (var tag : Tags.TOPIC_TAGS) {
            var count = rows.stream().mapToLong(row -> row.tags().getOrDefault(tag, 0L)).sum();
            frequency.put(tag, total == 0 ? 0 : (double) count / total);
        }
        return new Frequency(rating, total, frequency);
    }

    public static Frequency atRating(List<TagCountRow> counts, Integer userRating) {
        return atRating(counts, userRating, RecommendationConstants.FREQUENCY_WINDOW);
    }

    /** Problems with one rating: {@code total} rated problems, {@code tags} topic tag → count. */
    public record TagCountRow(int rating, long total, Map<String, Long> tags) {

        public TagCountRow {
            tags = Map.copyOf(tags);
        }
    }

    /** One (rating, tag) count from the database. */
    public record TagCount(int rating, String tag, long count) {
    }

    /** The rating used, the problems in its window, and topic tag → share. */
    public record Frequency(int rating, long total, Map<String, Double> frequency) {

        public Frequency {
            frequency = Map.copyOf(frequency);
        }

        public double share(String topic) {
            return frequency.getOrDefault(topic, 0.0);
        }
    }
}
