package com.algolearn.recommendations.calc;

import com.algolearn.recommendations.calc.TopicFrequency.Frequency;
import com.algolearn.stats.calc.TopicStatDoc;
import java.util.List;
import java.util.Map;

/** Fixtures of the pickNextTopics tests: a frequency map and single-topic stats. */
final class Picks {

    private Picks() {
    }

    static Frequency freq(Map<String, Double> shares, int rating) {
        return new Frequency(rating, 100, shares);
    }

    static TopicStatDoc stat(String key, String kind, int attempted, int solved, double strength, Integer comfort) {
        return new TopicStatDoc(key, kind, attempted, solved, attempted - solved, null, null, comfort, strength, null,
                List.of());
    }

    /** Legacy zone fixture: solved = round(attempted · strength), comfort 1400. */
    static TopicStatDoc stat(String key, int attempted, double strength) {
        return stat(key, "single", attempted, (int) Math.round(attempted * strength), strength, 1400);
    }

    static List<String> topics(List<TopicPick> picks) {
        return picks.stream().map(TopicPick::topic).toList();
    }
}
