package com.algolearn.stats.calc;

import com.algolearn.config.Tags;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

/** Topic keys a problem counts toward (legacy topicKeysFor). */
public final class TopicKeys {

    private TopicKeys() {
    }

    /**
     * Each topic tag ({@code *special} and unknown tags skipped, duplicates removed) as {@code single},
     * then every sorted pair of them as {@code pair}.
     */
    public static List<TopicKey> forTags(List<String> tags) {
        var topics = new ArrayList<String>();
        if (tags != null) {
            tags.stream().filter(Tags::isTopicTag).forEach(topics::add);
        }
        var sorted = List.copyOf(new TreeSet<>(topics));
        var keys = new ArrayList<TopicKey>();
        sorted.forEach(tag -> keys.add(new TopicKey(tag, "single")));
        for (var i = 0; i < sorted.size(); i++) {
            for (var j = i + 1; j < sorted.size(); j++) {
                keys.add(new TopicKey(Tags.pairKey(sorted.get(i), sorted.get(j)), "pair"));
            }
        }
        return keys;
    }

    /** A topic key and its kind ({@code single} or {@code pair}). */
    public record TopicKey(String topicKey, String kind) {
    }
}
