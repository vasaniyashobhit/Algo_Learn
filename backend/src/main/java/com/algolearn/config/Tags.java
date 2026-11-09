package com.algolearn.config;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** The 37 Codeforces tags in canonical order. {@code *special} is not a topic (36 topics, 630 pairs). */
public final class Tags {

    public static final String SPECIAL_TAG = "*special";

    public static final List<String> ALL_TAGS = List.of(
            "math", "greedy", "implementation", "dp", "data structures",
            "constructive algorithms", "brute force", "binary search", "sortings", "graphs",
            "dfs and similar", "trees", "number theory", "strings", "combinatorics",
            "bitmasks", "two pointers", SPECIAL_TAG, "geometry", "dsu",
            "divide and conquer", "shortest paths", "games", "probabilities", "interactive",
            "hashing", "flows", "matrices", "fft", "graph matchings",
            "string suffix structures", "ternary search", "meet-in-the-middle", "2-sat",
            "expression parsing", "chinese remainder theorem", "schedules");

    public static final List<String> TOPIC_TAGS = ALL_TAGS.stream().filter(t -> !SPECIAL_TAG.equals(t)).toList();

    private static final Set<String> TOPIC_SET = Set.copyOf(TOPIC_TAGS);

    public static final List<String> TOPIC_PAIR_KEYS = buildPairKeys();

    private Tags() {
    }

    public static boolean isTopicTag(String tag) {
        return tag != null && TOPIC_SET.contains(tag);
    }

    /** Sorted, {@code +}-joined key for two distinct topic tags, e.g. {@code bitmasks+dp}. */
    public static String pairKey(String a, String b) {
        if (!isTopicTag(a) || !isTopicTag(b) || a.equals(b)) {
            throw new ValidationException(ErrorCode.VALIDATION_FAILED, "A pair needs two distinct topic tags",
                    List.of(new FieldIssue("tags", "Invalid tag pair: \"%s\", \"%s\"".formatted(a, b))));
        }
        return a.compareTo(b) < 0 ? a + "+" + b : b + "+" + a;
    }

    private static List<String> buildPairKeys() {
        var keys = new ArrayList<String>();
        for (var i = 0; i < TOPIC_TAGS.size(); i++) {
            for (var j = i + 1; j < TOPIC_TAGS.size(); j++) {
                keys.add(pairKey(TOPIC_TAGS.get(i), TOPIC_TAGS.get(j)));
            }
        }
        return keys.stream().sorted().toList();
    }
}
