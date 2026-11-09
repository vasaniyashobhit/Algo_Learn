package com.algolearn.stats.calc;

import com.algolearn.stats.LastResult;
import java.time.Instant;
import java.util.List;

/** The computed fields of one topic_stats row (legacy toTopicStatDoc, without userId). */
public record TopicStatDoc(String topicKey, String kind, int attempted, int solved, int failed,
        Integer avgSolvedRating, Integer maxSolvedRating, Integer comfortRating, double strength,
        Instant lastActivityAt, List<LastResult> lastResults) {

    public TopicStatDoc {
        lastResults = List.copyOf(lastResults);
    }
}
